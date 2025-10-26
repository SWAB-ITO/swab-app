# Component Library Specification
**Version:** 1.0.0
**Component Count:** 10 new components

---

## Component Categories

1. **Primitives** (existing shadcn/ui) - Button, Card, Badge, Input, etc.
2. **Composite** (new) - Built from primitives for specific patterns
3. **Features** (new) - Complex, feature-specific components

---

## COMPOSITE COMPONENTS

### 1. StatusBadge

**Purpose:** Unified status/severity indicators throughout the app

**Location:** `src/components/composite/status-badge.tsx`

**Props:**
```typescript
interface StatusBadgeProps {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  severity?: 'info' | 'warning' | 'error' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Usage:**
```tsx
// Sync status
<StatusBadge status="completed" />
<StatusBadge status="running" />
<StatusBadge status="failed" />

// Error severity
<StatusBadge severity="critical" />
<StatusBadge severity="warning" />
```

**Variants:**
| Value | Color | Icon | Text |
|-------|-------|------|------|
| pending | gray | Clock | Pending |
| running | blue | Loader (animated) | Running |
| completed | green | CheckCircle | Completed |
| failed | red | XCircle | Failed |
| info | blue | Info | Info |
| warning | yellow | AlertTriangle | Warning |
| error | orange | AlertCircle | Error |
| critical | red | AlertOctagon | Critical |

**Implementation Notes:**
- Uses semantic color tokens from design system
- Icon size adjusts based on size prop
- Smooth color transitions
- Accessibility: proper ARIA labels

**Replaces:**
- `sync/page.tsx:198-221` - getSyncStatusBadge()
- `sync/page.tsx:211-221` - getSeverityBadge()
- All inline Badge components with custom colors

---

### 2. ConsoleOutput

**Purpose:** Terminal-style output display for sync operations

**Location:** `src/components/composite/console-output.tsx`

**Props:**
```typescript
interface ConsoleOutputProps {
  lines: string[];
  loading?: boolean;
  maxHeight?: string;
  showCopy?: boolean;
  showClear?: boolean;
  onClear?: () => void;
  className?: string;
}
```

**Features:**
- Auto-scroll to bottom on new lines
- Copy to clipboard button
- Clear button
- Loading state (pulsing cursor)
- Syntax highlighting (optional)
- Search/filter (future enhancement)

**Usage:**
```tsx
<ConsoleOutput
  lines={syncOutput}
  loading={syncRunning}
  showCopy
  showClear
  onClear={() => setSyncOutput([])}
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ [Copy] [Clear]                          │
├─────────────────────────────────────────┤
│ > Starting sync process...              │
│ > Fetching data from Jotform...         │
│ ✓ Fetched 985 submissions               │
│ > Processing records...                 │
│ ▊ (loading cursor if loading)           │
│                                         │
└─────────────────────────────────────────┘
```

**Styling:**
- `bg-muted` background
- `rounded-lg` corners
- `font-mono text-xs` monospace font
- `max-h-64 overflow-y-auto` scrollable
- `p-3` padding

**Replaces:**
- `sync/page.tsx:331-336` - Periodic Sync output
- `sync/page.tsx:375-380` - CSV Upload output
- Any future console output needs

---

### 3. StatCard

**Purpose:** Metric display card for dashboard stats

**Location:** `src/components/composite/stat-card.tsx`

**Props:**
```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  colorScheme?: 'default' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}
```

**Usage:**
```tsx
<StatCard
  title="Total Mentors"
  value={974}
  description="Active in the program"
  icon={Users}
  colorScheme="default"
/>

<StatCard
  title="Need Fundraising"
  value={787}
  description="Require fundraising support"
  icon={DollarSign}
  colorScheme="warning"
/>

<StatCard
  title="Need Training"
  value={974}
  description="Training signup needed"
  icon={GraduationCap}
  colorScheme="info"
  trend={{ value: 12, direction: 'up', label: 'from last week' }}
/>
```

**Visual Design:**
```
┌─────────────────────────────────┐
│ Total Mentors          [Icon]  │
│                                 │
│ 974                             │
│ Active in the program           │
│                                 │
│ ↑ 12 from last week (optional)  │
└─────────────────────────────────┘
```

**Features:**
- Icon placement (top-right)
- Large value display
- Optional trend indicator
- Loading state (Skeleton)
- Click handler for navigation
- Color scheme affects value color

**Color Schemes:**
| Scheme | Value Color | Icon Color |
|--------|-------------|------------|
| default | gray-900 | muted-foreground |
| success | green-600 | green-600 |
| warning | orange-600 | orange-600 |
| error | red-600 | red-600 |
| info | blue-600 | blue-600 |

**Replaces:**
- `page.tsx:52-111` - Dashboard stat cards
- Any future metric displays

---

### 4. Checklist

**Purpose:** Visual checklist with progress indicator

**Location:** `src/components/composite/checklist.tsx`

**Props:**
```typescript
interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  required?: boolean;
}

interface ChecklistProps {
  items: ChecklistItem[];
  title?: string;
  showProgress?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
}
```

**Usage:**
```tsx
<Checklist
  title="Pre-sync Checklist"
  showProgress
  items={[
    { id: '1', label: 'Jotform API configured', completed: true, required: true },
    { id: '2', label: 'Givebutter API configured', completed: true, required: true },
    { id: '3', label: 'Forms selected', completed: false, required: true },
    { id: '4', label: 'CSV uploaded', completed: false },
  ]}
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ Pre-sync Checklist              (3/5)  │
│ ────────────── 60%                      │
│                                         │
│ ✓ Jotform API configured               │
│   API key successfully validated        │
│                                         │
│ ✓ Givebutter API configured            │
│   Connected to campaign                 │
│                                         │
│ ○ Forms selected                        │
│   Select forms to sync                  │
│                                         │
│ ○ CSV uploaded                          │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Progress bar (optional)
- Completion count
- Icons (CheckCircle / Circle)
- Item descriptions (optional)
- Required indicator (*)
- Color coding (completed = green, incomplete = gray)

**Replaces:**
- `settings/page.tsx:841-878` - Pre-sync checklist
- Any future checklist needs

---

### 5. StatusCard

**Purpose:** System status display with multiple metrics

**Location:** `src/components/composite/status-card.tsx`

**Props:**
```typescript
interface StatusMetric {
  label: string;
  value: string | number;
  timestamp?: Date;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

interface StatusCardProps {
  title: string;
  configured: boolean;
  configuredAt?: Date;
  metrics: StatusMetric[];
  actions?: React.ReactNode;
  className?: string;
}
```

**Usage:**
```tsx
<StatusCard
  title="API Configuration"
  configured={true}
  configuredAt={new Date('2025-10-24')}
  metrics={[
    { label: 'Jotform Sync', value: '2 hours ago', status: 'success' },
    { label: 'Givebutter Sync', value: '3 hours ago', status: 'success' },
    { label: 'ETL Process', value: 'Failed', status: 'error' },
  ]}
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ ✓ API Configuration           [Active] │
│   Configured on 10/24/2025, 3:08 PM    │
│                                         │
│ Last Sync Times:                        │
│ Jotform Sync     2 hours ago        ✓  │
│ Givebutter Sync  3 hours ago        ✓  │
│ ETL Process      Failed             ✗  │
└─────────────────────────────────────────┘
```

**Features:**
- Badge for configured status
- Timestamp formatting
- Metrics grid
- Status indicators per metric
- Actions slot for buttons

**Replaces:**
- `settings/page.tsx:500-526` - Configuration status Alert
- `sync/page.tsx:244-296` - Status cards

---

### 6. FormSelector

**Purpose:** Enhanced select dropdown for forms/campaigns with search

**Location:** `src/components/composite/form-selector.tsx`

**Props:**
```typescript
interface FormOption {
  id: string;
  title: string;
  count: number;
  status?: string;
  category?: string;
}

interface FormSelectorProps {
  label: string;
  placeholder?: string;
  options: FormOption[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  groupBy?: 'category' | 'status';
  searchable?: boolean;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
}
```

**Usage:**
```tsx
<FormSelector
  label="Signup Form"
  placeholder="Select a form..."
  options={jotformForms}
  value={selectedForm}
  onChange={setSelectedForm}
  searchable
  required
  description="Form for mentor signups"
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ Signup Form                         * │
│ ┌─────────────────────────────────┐  │
│ │ 2025 Mentor Sign Up         [985]│  │
│ │ └─────────────────────────────────┘  │
│ Form for mentor signups               │
└─────────────────────────────────────────┘

When opened:
┌─────────────────────────────────────────┐
│ [Search forms...]                      │
├─────────────────────────────────────────┤
│ Active Forms (3)                        │
│  2025 Mentor Sign Up              [985]│
│  2025 Givebutter Setup            [873]│
│  Training Sign Up                 [443]│
├─────────────────────────────────────────┤
│ Archived Forms (19)                     │
│  2024 Mentor Sign Up              [654]│
│  ...                                    │
└─────────────────────────────────────────┘
```

**Features:**
- Built on shadcn Select
- Search/filter
- Grouped options
- Badge for counts
- Loading state
- Error state
- Required indicator (*)

**Replaces:**
- `settings/page.tsx:660-705` - Native select elements
- `settings/page.tsx:727-740` - Campaign select

---

## FEATURE COMPONENTS

### 7. SyncActionCard

**Purpose:** Card for sync operations with embedded console output

**Location:** `src/components/features/sync/sync-action-card.tsx`

**Props:**
```typescript
interface SyncActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  onAction: () => void;
  output: string[];
  running: boolean;
  disabled?: boolean;
  tier?: string;
  className?: string;
}
```

**Usage:**
```tsx
<SyncActionCard
  title="Periodic Sync"
  description="Sync from APIs: Jotform + Givebutter + ETL"
  icon={RefreshCw}
  actionLabel="Run Periodic Sync"
  onAction={handlePeriodicSync}
  output={syncOutput}
  running={syncRunning}
  tier="Tier 2"
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ [Icon] Periodic Sync (Tier 2)          │
│ Sync from APIs: Jotform + Givebutter   │
│                                         │
│ [Run Periodic Sync Button]             │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ > Starting sync...               │    │
│ │ ✓ Completed                      │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Features:**
- Card with icon and title
- Tier badge (optional)
- Action button with loading state
- Embedded ConsoleOutput
- Collapses when no output

**Replaces:**
- `sync/page.tsx:300-338` - Periodic Sync card
- `sync/page.tsx:340-383` - CSV Upload card

---

### 8. ConfigWizard

**Purpose:** Multi-step configuration wizard with validation

**Location:** `src/components/features/config/config-wizard.tsx`

**Props:**
```typescript
interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<WizardStepProps>;
  validate?: () => boolean | Promise<boolean>;
}

interface ConfigWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  className?: string;
}
```

**Usage:**
```tsx
<ConfigWizard
  steps={[
    {
      id: 'config',
      title: 'Configure',
      description: 'Set up API keys',
      component: ConfigStep,
      validate: () => apiKeysValid,
    },
    {
      id: 'forms',
      title: 'Forms',
      description: 'Select forms',
      component: FormsStep,
      validate: () => formsSelected,
    },
    // ...
  ]}
  currentStep={activeStep}
  onStepChange={setActiveStep}
  onComplete={handleComplete}
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ API Configuration & Data Sync           │
│                                         │
│ [1] Configure  →  [2] Forms  →  [3] Upload  →  [4] Sync │
│  ✓ Complete      In Progress    Pending     Pending   │
│ ─────────────────────────────────────────────────  50% │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │                                 │    │
│ │   [Step 2 Content: Forms]       │    │
│ │                                 │    │
│ └─────────────────────────────────┘    │
│                                         │
│         [← Back]  [Continue →]          │
└─────────────────────────────────────────┘
```

**Features:**
- Step indicator (1/4, 2/4, etc.)
- Progress bar
- Visual step states (completed, current, pending)
- Step validation before advancing
- Back/Next navigation
- Skip to step (if previous completed)
- Keyboard navigation (Arrow keys)
- State persistence

**Replaces:**
- `settings/page.tsx:490-942` - Entire tab-based wizard
- Reduces 27 state variables to ~8

---

### 9. FileUpload

**Purpose:** Drag-and-drop file upload with validation

**Location:** `src/components/composite/file-upload.tsx`

**Props:**
```typescript
interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onChange: (file: File) => void;
  onError?: (error: string) => void;
  uploading?: boolean;
  uploadedFile?: { name: string; size: number };
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
<FileUpload
  accept=".csv"
  maxSize={10 * 1024 * 1024} // 10MB
  onChange={handleFileUpload}
  uploading={csvUploading}
  uploadedFile={uploadedFile}
  uploadStatus={uploadStatus}
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│             [Upload Icon]              │
│                                         │
│      Click to upload CSV               │
│      or drag and drop                   │
│                                         │
│      Givebutter full contact export     │
└─────────────────────────────────────────┘

After upload:
┌─────────────────────────────────────────┐
│ [File Icon] givebutter-export.csv       │
│             2.4 MB             [✓ Done] │
└─────────────────────────────────────────┘
```

**Features:**
- Drag and drop
- Click to upload
- File type validation
- Size validation
- Upload progress (optional)
- Success/error states
- Remove file button

**Replaces:**
- `sync/page.tsx:353-372` - CSV upload UI
- `settings/page.tsx:761-796` - CSV upload UI

---

### 10. SyncLogList

**Purpose:** Display recent sync operations with expandable details

**Location:** `src/components/features/sync/sync-log-list.tsx`

**Props:**
```typescript
interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  records_processed?: number;
  records_inserted?: number;
  error_message?: string;
}

interface SyncLogListProps {
  logs: SyncLog[];
  loading?: boolean;
  emptyMessage?: string;
  maxVisible?: number;
  showFilters?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
<SyncLogList
  logs={syncLogs}
  loading={loadingSyncLogs}
  maxVisible={10}
  showFilters
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ Recent Sync Operations                  │
│                                         │
│ [Filters: All | Completed | Failed]     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ jotform_signups       [Completed] ✓│ │
│ │ Started: 10/24 3:08 PM              │ │
│ │ Duration: 45s                       │ │
│ │ Processed: 985 | Inserted: 12       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ etl_process           [Failed] ✗    │ │
│ │ Started: 10/24 3:02 PM              │ │
│ │ Duration: 12s                       │ │
│ │ Error: Connection timeout           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Features:**
- StatusBadge for sync status
- Expandable for error details
- Filters (all, completed, failed)
- Loading skeleton
- Empty state
- Pagination (future)

**Replaces:**
- `sync/page.tsx:386-438` - Sync logs section
- `sync/page.tsx:398-434` - Log item rendering

---

## Component Dependencies

```
Primitives (shadcn/ui)
├── Button
├── Card
├── Badge
└── Select
    │
    └─→ Composite Components
        ├── StatusBadge (uses Badge)
        ├── ConsoleOutput (uses Card)
        ├── StatCard (uses Card)
        ├── Checklist (custom)
        ├── StatusCard (uses Card, StatusBadge)
        ├── FormSelector (uses Select, Badge)
        └── FileUpload (custom)
            │
            └─→ Feature Components
                ├── SyncActionCard (uses Card, Button, ConsoleOutput)
                ├── ConfigWizard (uses Card, Button, Checklist)
                └── SyncLogList (uses Card, StatusBadge)
```

---

## Testing Strategy

### Unit Tests
- Each component isolated
- Props validation
- Event handlers
- State management

### Integration Tests
- Component composition
- Feature components with composites
- User flows (wizard, sync)

### Accessibility Tests
- Keyboard navigation
- Screen reader announcements
- Color contrast
- Focus management

---

## Documentation Requirements

Each component must have:
1. JSDoc comments with examples
2. Prop descriptions
3. Usage examples
4. Storybook story (future)
5. Accessibility notes

Example:
```typescript
/**
 * StatusBadge - Displays status or severity indicators
 *
 * @example
 * <StatusBadge status="completed" />
 * <StatusBadge severity="critical" size="lg" />
 *
 * @accessibility
 * - Uses semantic HTML
 * - Includes ARIA label for status
 * - Meets WCAG color contrast requirements
 */
```

---

## Migration Path

### Phase 1: Core Composites
1. StatusBadge ← Highest ROI (used everywhere)
2. ConsoleOutput ← Easy win (clear duplication)
3. StatCard ← Dashboard improvement

### Phase 2: Advanced Composites
4. Checklist
5. StatusCard
6. FormSelector

### Phase 3: Feature Components
7. FileUpload
8. SyncActionCard
9. SyncLogList
10. ConfigWizard ← Most complex, highest impact

---

## Success Metrics

| Metric | Before | Target | Method |
|--------|--------|--------|--------|
| Code Duplication | 30% | <5% | Static analysis |
| Component Count | 8 | 18 | File count |
| Lines per Page | 400-950 | 150-300 | LOC counter |
| State Variables (Settings) | 27 | <10 | Manual count |
| Accessibility Score | Unknown | 95+ | Lighthouse |
| Bundle Size | Baseline | <+10% | Webpack analyzer |
