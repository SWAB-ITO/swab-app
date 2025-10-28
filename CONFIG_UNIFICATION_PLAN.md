# Config System Unification Plan

**Problem:** Two config systems with duplicate data
**Goal:** Single source of truth for all configuration
**Estimated Time:** 2-3 hours

---

## Current State Analysis

### System 1: `sync_config` (singular)
**Schema:**
```sql
CREATE TABLE sync_config (
  id INTEGER PRIMARY KEY,
  jotform_api_key TEXT,
  givebutter_api_key TEXT,
  jotform_signup_form_id TEXT,
  jotform_setup_form_id TEXT,
  jotform_training_signup_form_id TEXT,
  givebutter_campaign_code TEXT,
  configured_by TEXT,
  configured_at TIMESTAMPTZ,
  system_initialized BOOLEAN
);
```

**Used By:**
- Settings wizard UI (`/api/sync/config`)
- Single-row design (id = 1)
- No year support

**Data Quality:** ✅ CORRECT (populated by wizard)

---

### System 2: `sync_configs` (plural)
**Schema:**
```sql
CREATE TABLE sync_configs (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(year, config_key)
);
```

**Used By:**
- Backend sync scripts
- Multi-row, year-specific design
- Supports multiple years

**Data Quality:** ❌ WRONG (placeholder values from Phase 1 migration)

---

## Option 1: Quick Fix (Immediate)

**Copy correct values from `sync_config` to `sync_configs`:**

```sql
-- Get current values from wizard
SELECT
  jotform_signup_form_id,
  jotform_setup_form_id,
  jotform_training_signup_form_id,
  givebutter_campaign_code
FROM sync_config WHERE id = 1;

-- Update sync_configs with correct values
UPDATE sync_configs SET config_value = (
  SELECT jotform_signup_form_id FROM sync_config WHERE id = 1
) WHERE year = 2025 AND config_key = 'jotform_signup_form_id';

UPDATE sync_configs SET config_value = (
  SELECT jotform_setup_form_id FROM sync_config WHERE id = 1
) WHERE year = 2025 AND config_key = 'jotform_setup_form_id';

UPDATE sync_configs SET config_value = (
  SELECT jotform_training_signup_form_id FROM sync_config WHERE id = 1
) WHERE year = 2025 AND config_key = 'jotform_training_form_id';

UPDATE sync_configs SET config_value = (
  SELECT givebutter_campaign_code FROM sync_config WHERE id = 1
) WHERE year = 2025 AND config_key = 'givebutter_campaign_code';
```

**Pros:**
- ✅ Immediate fix (5 minutes)
- ✅ No code changes
- ✅ Sync scripts work immediately

**Cons:**
- ❌ Still have two systems
- ❌ Data can get out of sync again
- ❌ Confusing for future developers

---

## Option 2: Full Unification (Recommended)

Migrate wizard to use `sync_configs` table.

### Step 1: Migrate Data
```sql
-- Populate sync_configs from sync_config (one-time)
INSERT INTO sync_configs (year, config_key, config_value, description)
SELECT
  2025 as year,
  'jotform_signup_form_id' as config_key,
  jotform_signup_form_id as config_value,
  'Mentor Sign Up Form ID' as description
FROM sync_config WHERE id = 1 AND jotform_signup_form_id IS NOT NULL
ON CONFLICT (year, config_key) DO UPDATE
  SET config_value = EXCLUDED.config_value;

-- Repeat for all fields...
-- (see full SQL below)
```

### Step 2: Update Wizard API Route

**File:** `src/app/api/sync/config/route.ts`

**GET Endpoint Changes:**
```typescript
// OLD (from sync_config)
const { data: config } = await supabase
  .from('sync_config')
  .select('*')
  .eq('id', 1)
  .single();

// NEW (from sync_configs)
const { data: configRows } = await supabase
  .from('sync_configs')
  .select('*')
  .eq('year', 2025)
  .eq('active', true);

// Transform to legacy format for UI compatibility
const config = configRows ? {
  jotform_api_key: findConfig(configRows, 'jotform_api_key'),
  givebutter_api_key: findConfig(configRows, 'givebutter_api_key'),
  jotform_signup_form_id: findConfig(configRows, 'jotform_signup_form_id'),
  jotform_setup_form_id: findConfig(configRows, 'jotform_setup_form_id'),
  jotform_training_signup_form_id: findConfig(configRows, 'jotform_training_form_id'),
  givebutter_campaign_code: findConfig(configRows, 'givebutter_campaign_code'),
  configured_at: configRows[0]?.created_at,
} : null;
```

**POST Endpoint Changes:**
```typescript
// OLD (upsert single row)
await supabase.from('sync_config').upsert({
  id: 1,
  jotform_api_key: jotformApiKey,
  // ...
});

// NEW (upsert multiple rows)
const configRows = [
  { year: 2025, config_key: 'jotform_api_key', config_value: jotformApiKey },
  { year: 2025, config_key: 'givebutter_api_key', config_value: givebutterApiKey },
  { year: 2025, config_key: 'jotform_signup_form_id', config_value: jotformSignupFormId },
  { year: 2025, config_key: 'jotform_setup_form_id', config_value: jotformSetupFormId },
  { year: 2025, config_key: 'jotform_training_form_id', config_value: jotformTrainingSignupFormId },
  { year: 2025, config_key: 'givebutter_campaign_code', config_value: givebutterCampaignCode },
];

await supabase.from('sync_configs').upsert(configRows);
```

### Step 3: Update Config Loader

**File:** `src/lib/server/config/sync-config-loader.ts`

**Add API Keys Support:**
```typescript
export interface SyncConfig {
  // Existing fields
  jotformSignupFormId: string;
  jotformSetupFormId: string;
  jotformTrainingFormId: string;
  givebutterCampaignCode: string;
  givebutterMentorTag: string;
  fundraisingGoal: number;
  eventDate: string;

  // NEW: Add API keys
  jotformApiKey?: string;
  givebutterApiKey?: string;
}

export async function loadSyncConfig(
  year: number,
  supabaseUrl: string,
  supabaseKey: string
): Promise<SyncConfig> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('sync_configs')
    .select('*')
    .eq('year', year)
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to load sync config for year ${year}: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No active sync configuration found for year ${year}`);
  }

  const getConfig = (key: string, required: boolean = true): string | undefined => {
    const config = data.find((c) => c.config_key === key);
    if (!config && required) {
      throw new Error(`Missing required config: ${key} for year ${year}`);
    }
    return config?.config_value;
  };

  return {
    jotformSignupFormId: getConfig('jotform_signup_form_id')!,
    jotformSetupFormId: getConfig('jotform_setup_form_id')!,
    jotformTrainingFormId: getConfig('jotform_training_form_id')!,
    givebutterCampaignCode: getConfig('givebutter_campaign_code')!,
    givebutterMentorTag: getConfig('givebutter_mentor_tag')!,
    fundraisingGoal: parseInt(getConfig('fundraising_goal')!),
    eventDate: getConfig('event_date')!,

    // Optional: API keys (only needed in some contexts)
    jotformApiKey: getConfig('jotform_api_key', false),
    givebutterApiKey: getConfig('givebutter_api_key', false),
  };
}
```

### Step 4: Drop Old Table

```sql
-- After confirming everything works
DROP TABLE sync_config CASCADE;
```

---

## Recommended Approach: Hybrid (Best of Both)

1. **Immediate (5 min):** Run Option 1 SQL to fix current issue
2. **Later (2-3 hours):** Implement Option 2 properly

**Why Hybrid:**
- ✅ Sync scripts work immediately
- ✅ Gives time to properly test wizard changes
- ✅ No rush, no breaking changes
- ✅ Can do refactoring in Phase 2

---

## Implementation Steps

### Immediate Fix (Now)

```sql
-- 1. Check current values in wizard config
SELECT * FROM sync_config WHERE id = 1;

-- 2. Update sync_configs with correct values
UPDATE sync_configs
SET config_value = (SELECT givebutter_campaign_code FROM sync_config WHERE id = 1)
WHERE year = 2025 AND config_key = 'givebutter_campaign_code';

-- 3. Verify
SELECT config_key, config_value FROM sync_configs WHERE year = 2025;
```

### Full Refactoring (Later - Phase 2)

1. Create migration to sync data from `sync_config` → `sync_configs`
2. Update `/api/sync/config` route to use `sync_configs`
3. Test wizard thoroughly
4. Update config loader to include API keys
5. Drop `sync_config` table
6. Update documentation

---

## Decision Matrix

| Criteria | Option 1 (Quick Fix) | Option 2 (Unify) | Hybrid |
|----------|---------------------|------------------|--------|
| **Time to fix** | 5 min | 2-3 hours | 5 min now, 2-3 hours later |
| **Risk** | Low | Medium | Low |
| **Long-term maintainability** | Poor | Excellent | Excellent |
| **Data consistency** | Can drift | Always in sync | Eventually in sync |
| **Recommended?** | ⚠️ Temporary | ✅ Eventually | ✅ Yes |

---

## Full SQL for Immediate Fix

```sql
-- Get current wizard configuration
DO $$
DECLARE
  v_jotform_signup TEXT;
  v_jotform_setup TEXT;
  v_jotform_training TEXT;
  v_campaign_code TEXT;
BEGIN
  -- Fetch from sync_config
  SELECT
    jotform_signup_form_id,
    jotform_setup_form_id,
    jotform_training_signup_form_id,
    givebutter_campaign_code
  INTO
    v_jotform_signup,
    v_jotform_setup,
    v_jotform_training,
    v_campaign_code
  FROM sync_config
  WHERE id = 1;

  -- Update sync_configs if values exist
  IF v_jotform_signup IS NOT NULL THEN
    UPDATE sync_configs
    SET config_value = v_jotform_signup
    WHERE year = 2025 AND config_key = 'jotform_signup_form_id';
  END IF;

  IF v_jotform_setup IS NOT NULL THEN
    UPDATE sync_configs
    SET config_value = v_jotform_setup
    WHERE year = 2025 AND config_key = 'jotform_setup_form_id';
  END IF;

  IF v_jotform_training IS NOT NULL THEN
    UPDATE sync_configs
    SET config_value = v_jotform_training
    WHERE year = 2025 AND config_key = 'jotform_training_form_id';
  END IF;

  IF v_campaign_code IS NOT NULL THEN
    UPDATE sync_configs
    SET config_value = v_campaign_code
    WHERE year = 2025 AND config_key = 'givebutter_campaign_code';
  END IF;

  RAISE NOTICE 'Updated sync_configs with values from sync_config';
END $$;

-- Verify the update
SELECT config_key, config_value
FROM sync_configs
WHERE year = 2025
ORDER BY config_key;
```

---

## Recommendation

**Do the Hybrid Approach:**

1. **Now:** Run the immediate fix SQL above
2. **Test:** Run `npm run sync:givebutter-members` to verify it works
3. **Later (Phase 2):** Properly unify the config systems

This gives you:
- ✅ Working syncs immediately
- ✅ Time to properly plan the refactoring
- ✅ No rushed changes to the wizard
- ✅ Clean architecture eventually

**Want me to run the immediate fix SQL for you?**
