# MCP Tools Specification - Complete API Coverage

## Overview

This document specifies ALL tools to implement for the Jotform and Givebutter MCP servers.

**Design Principle:** Every API client method = one MCP tool

This provides Claude Code with complete, interactive access to all operations for real-time checking, verification, and data management.

---

## Jotform MCP Server

### Server Metadata

```typescript
{
  name: "jotform-mcp-server",
  version: "1.0.0",
  description: "Access and manage Jotform forms, submissions, and data",
  author: "SWAB Mentor Database Team"
}
```

### Resources (Read-Only Data Access)

#### 1. `jotform://forms`
**Purpose:** List all forms in the account

**Response Format:**
```json
{
  "forms": [
    {
      "id": "231234567890",
      "title": "Mentor Application Form",
      "status": "ENABLED",
      "created_at": "2025-01-15T10:30:00Z",
      "count": "156",
      "url": "https://form.jotform.com/231234567890"
    }
  ],
  "total": 12
}
```

**Use Cases:**
- "What forms do I have?"
- "Show me all active forms"
- "List my forms"

---

#### 2. `jotform://form/{formId}`
**Purpose:** Get detailed information about a specific form

**Parameters:**
- `formId` (required) - The form ID

**Response Format:**
```json
{
  "id": "231234567890",
  "title": "Mentor Application Form",
  "status": "ENABLED",
  "created_at": "2025-01-15T10:30:00Z",
  "submission_count": 156,
  "url": "https://form.jotform.com/231234567890",
  "properties": {
    "thankurl": "https://example.com/thank-you",
    "activeRedirect": "thankurl"
  }
}
```

**Use Cases:**
- "Show me details about form 231234567890"
- "What's the thank you URL for this form?"

---

#### 3. `jotform://form/{formId}/questions`
**Purpose:** Get all questions from a form

**Parameters:**
- `formId` (required) - The form ID

**Response Format:**
```json
{
  "questions": {
    "1": {
      "name": "firstName",
      "text": "First Name",
      "type": "control_textbox",
      "order": "1",
      "required": "Yes"
    },
    "2": {
      "name": "lastName",
      "text": "Last Name",
      "type": "control_textbox",
      "order": "2",
      "required": "Yes"
    },
    "3": {
      "name": "email",
      "text": "Email Address",
      "type": "control_email",
      "order": "3",
      "required": "Yes"
    }
  }
}
```

**Use Cases:**
- "What questions are on this form?"
- "Show me the form structure"
- "What fields does this form collect?"

---

#### 4. `jotform://form/{formId}/submissions`
**Purpose:** Get all submissions for a form (paginated)

**Parameters:**
- `formId` (required) - The form ID
- `limit` (optional) - Number of submissions (default: 100, max: 1000)
- `offset` (optional) - Starting offset for pagination

**Response Format:**
```json
{
  "submissions": [
    {
      "id": "6234567890123456789",
      "created_at": "2025-10-20T14:30:00Z",
      "status": "ACTIVE",
      "answers": {
        "1": { "name": "firstName", "answer": "John" },
        "2": { "name": "lastName", "answer": "Doe" },
        "3": { "name": "email", "answer": "john@example.com" }
      }
    }
  ],
  "total": 156,
  "limit": 100,
  "offset": 0
}
```

**Use Cases:**
- "Show me recent form submissions"
- "Get all responses to the mentor application"

---

#### 5. `jotform://submission/{submissionId}`
**Purpose:** Get a specific submission by ID

**Parameters:**
- `submissionId` (required) - The submission ID

**Response Format:**
```json
{
  "id": "6234567890123456789",
  "form_id": "231234567890",
  "created_at": "2025-10-20T14:30:00Z",
  "updated_at": "2025-10-20T14:35:00Z",
  "status": "ACTIVE",
  "ip": "192.168.1.1",
  "answers": {
    "1": { "name": "firstName", "answer": "John" },
    "2": { "name": "lastName", "answer": "Doe" },
    "3": { "name": "email", "answer": "john@example.com" }
  }
}
```

**Use Cases:**
- "Show me submission details"
- "Get the full response for this submission"

---

### Tools (Actions & Operations)

#### 1. `search_submissions`
**Purpose:** Search form submissions with advanced filters

**Parameters:**
```typescript
{
  formId: string;           // Required
  filter?: {
    status?: string;        // e.g., "ACTIVE", "DELETED"
    created_at_gt?: string; // ISO date - after this date
    created_at_lt?: string; // ISO date - before this date
    [key: string]: any;     // Custom field filters
  };
  limit?: number;           // Default: 100
  orderBy?: string;         // e.g., "created_at", "updated_at"
}
```

**Response Format:**
```json
{
  "results": [
    {
      "id": "6234567890123456789",
      "created_at": "2025-10-20T14:30:00Z",
      "answers": { ... },
      "status": "ACTIVE"
    }
  ],
  "total": 45,
  "query": {
    "formId": "231234567890",
    "filter": { "status": "ACTIVE" }
  }
}
```

**Use Cases:**
- "Find all active submissions from the last week"
- "Search for submissions with email containing '@example.com'"
- "Show me deleted submissions"

**Implementation Notes:**
- Use Jotform's filter parameter in API
- Support date range filtering
- Support custom field filtering

---

#### 2. `analyze_form_responses`
**Purpose:** Get statistical analysis of form responses

**Parameters:**
```typescript
{
  formId: string;           // Required
  questionIds?: string[];   // Analyze specific questions (optional)
  dateRange?: {
    start: string;          // ISO date
    end: string;            // ISO date
  };
}
```

**Response Format:**
```json
{
  "form_id": "231234567890",
  "total_submissions": 156,
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-10-25",
    "days": 298
  },
  "analysis": {
    "submission_rate": "0.52 per day",
    "peak_day": "Monday",
    "questions": [
      {
        "id": "3",
        "name": "email",
        "type": "control_email",
        "unique_responses": 152,
        "completion_rate": "97.4%"
      }
    ]
  }
}
```

**Use Cases:**
- "Analyze responses to the mentor application"
- "What's the completion rate for each question?"
- "Show me submission trends"

**Implementation Notes:**
- Fetch all submissions
- Process locally to generate statistics
- Cache results for performance

---

#### 3. `export_form_data`
**Purpose:** Export form submissions to various formats

**Parameters:**
```typescript
{
  formId: string;           // Required
  format: 'json' | 'csv' | 'tsv';
  includeHeaders?: boolean; // For CSV/TSV (default: true)
  fields?: string[];        // Specific fields to export (optional)
  filter?: object;          // Same as search_submissions
}
```

**Response Format:**
```json
{
  "format": "csv",
  "rows": 156,
  "data": "ID,Created At,First Name,Last Name,Email\n6234567890123456789,2025-10-20T14:30:00Z,John,Doe,john@example.com\n...",
  "metadata": {
    "exported_at": "2025-10-25T10:00:00Z",
    "form_id": "231234567890",
    "form_title": "Mentor Application Form"
  }
}
```

**Use Cases:**
- "Export all submissions to CSV"
- "Download form responses as JSON"
- "Give me a TSV export of the last month's submissions"

**Implementation Notes:**
- Support multiple formats
- Handle large datasets efficiently
- Include metadata for traceability

---

#### 4. `get_submission_by_email`
**Purpose:** Find submissions by email address

**Parameters:**
```typescript
{
  formId: string;           // Required
  email: string;            // Email to search for
  emailFieldId?: string;    // Optional - specify which field contains email
}
```

**Response Format:**
```json
{
  "email": "john@example.com",
  "submissions": [
    {
      "id": "6234567890123456789",
      "created_at": "2025-10-20T14:30:00Z",
      "answers": { ... }
    }
  ],
  "total": 1
}
```

**Use Cases:**
- "Find all submissions from john@example.com"
- "Has this person submitted the form before?"
- "Show me all forms filled out by this email"

**Implementation Notes:**
- Auto-detect email field if not specified
- Support partial email matching
- Handle multiple submissions per email

---

#### 5. `get_form_webhooks`
**Purpose:** List all webhooks configured for a form

**Parameters:**
```typescript
{
  formId: string;           // Required
}
```

**Response Format:**
```json
{
  "webhooks": [
    {
      "id": "123456",
      "url": "https://api.example.com/webhook",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 2
}
```

**Use Cases:**
- "What webhooks are set up for this form?"
- "Show me webhook configurations"

---

### Prompts (Reusable Templates)

#### 1. `analyze_mentor_applications`
**Purpose:** Comprehensive analysis of mentor application forms

**Template:**
```
Analyze the mentor application form submissions and provide:

1. **Summary Statistics**
   - Total applications
   - Applications per week
   - Completion rate
   - Average time to complete

2. **Demographics** (if available)
   - Geographic distribution
   - Experience levels
   - Areas of expertise

3. **Quality Assessment**
   - Complete vs incomplete applications
   - Common missing fields
   - Data quality issues

4. **Recommendations**
   - Top candidates based on criteria
   - Applications requiring follow-up
   - Suggested improvements to form

Use the following form: {{formId}}
Date range: {{startDate}} to {{endDate}}
```

**Use Cases:**
- Quick analysis of application quality
- Identifying top candidates
- Form optimization insights

---

#### 2. `export_for_crm`
**Purpose:** Export form data in CRM-friendly format

**Template:**
```
Export form submissions in a format ready for CRM import:

1. **Format Requirements**
   - CSV with standard headers
   - Phone numbers formatted as E.164
   - Dates in ISO 8601 format
   - Names split into first/last

2. **Field Mapping**
   - Map form fields to CRM fields
   - Handle custom fields
   - Include submission metadata

3. **Validation**
   - Check for duplicate emails
   - Validate phone numbers
   - Flag incomplete records

Form ID: {{formId}}
CRM System: {{crmSystem}}
```

**Use Cases:**
- Preparing data for import into Givebutter
- Syncing with external CRM
- Data migration tasks

---

## Givebutter MCP Server

### Server Metadata

```typescript
{
  name: "givebutter-mcp-server",
  version: "1.0.0",
  description: "Access and manage Givebutter campaigns, contacts, and fundraising data",
  author: "SWAB Mentor Database Team"
}
```

### Resources (Read-Only Data Access)

#### 1. `givebutter://campaigns`
**Purpose:** List all campaigns

**Response Format:**
```json
{
  "campaigns": [
    {
      "id": 12345,
      "code": "mentor-2025",
      "title": "2025 Mentor Fundraising Campaign",
      "raised": 45000.00,
      "goal": 100000.00,
      "donors": 156,
      "members": 45,
      "status": "active",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "url": "https://givebutter.com/mentor-2025"
    }
  ],
  "total": 3
}
```

**Use Cases:**
- "Show me all campaigns"
- "What fundraising campaigns are active?"

---

#### 2. `givebutter://campaign/{campaignId}`
**Purpose:** Get detailed campaign information

**Parameters:**
- `campaignId` (required) - The campaign ID

**Response Format:**
```json
{
  "id": 12345,
  "code": "mentor-2025",
  "title": "2025 Mentor Fundraising Campaign",
  "description": "Support our mentors...",
  "raised": 45000.00,
  "goal": 100000.00,
  "donors": 156,
  "members": 45,
  "status": "active",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "url": "https://givebutter.com/mentor-2025",
  "created_at": "2024-12-01T10:00:00Z"
}
```

**Use Cases:**
- "Show me campaign details"
- "What's the progress on the mentor campaign?"

---

#### 3. `givebutter://campaign/{campaignId}/members`
**Purpose:** Get all members (fundraisers) for a campaign

**Parameters:**
- `campaignId` (required) - The campaign ID
- `page` (optional) - Page number (default: 1)
- `perPage` (optional) - Items per page (default: 100, max: 100)

**Response Format:**
```json
{
  "members": [
    {
      "id": 67890,
      "first_name": "Jane",
      "last_name": "Smith",
      "display_name": "Jane S.",
      "email": "jane@example.com",
      "phone": "+15551234567",
      "raised": 2500.00,
      "goal": 5000.00,
      "donors": 12,
      "url": "https://givebutter.com/mentor-2025/jane-smith"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 100,
    "total": 45,
    "last_page": 1
  }
}
```

**Use Cases:**
- "Who are the top fundraisers?"
- "Show me all campaign members"
- "List everyone participating in the mentor campaign"

---

#### 4. `givebutter://contacts`
**Purpose:** List all contacts in the database

**Parameters:**
- `page` (optional) - Page number (default: 1)
- `perPage` (optional) - Items per page (default: 100, max: 100)

**Response Format:**
```json
{
  "contacts": [
    {
      "id": 98765,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+15551234567",
      "tags": ["mentor", "donor"],
      "custom_fields": {
        "preferred_name": "Johnny",
        "mentor_status": "active"
      },
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-10-20T14:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 100,
    "total": 523,
    "last_page": 6
  }
}
```

**Use Cases:**
- "Show me all contacts"
- "List everyone in the database"

---

#### 5. `givebutter://contact/{contactId}`
**Purpose:** Get detailed contact information

**Parameters:**
- `contactId` (required) - The contact ID

**Response Format:**
```json
{
  "id": 98765,
  "external_id": "MENTOR-2025-001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "address": {
    "line1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "country": "US"
  },
  "tags": ["mentor", "donor", "volunteer"],
  "custom_fields": {
    "preferred_name": "Johnny",
    "mentor_status": "active",
    "fundraising_goal": "5000",
    "amount_raised": "2500"
  },
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-10-20T14:30:00Z"
}
```

**Use Cases:**
- "Show me contact details for ID 98765"
- "Get full information about this contact"

---

#### 6. `givebutter://transactions`
**Purpose:** List all transactions

**Parameters:**
- `page` (optional) - Page number
- `perPage` (optional) - Items per page
- `campaignId` (optional) - Filter by campaign
- `contactId` (optional) - Filter by contact
- `status` (optional) - Filter by status

**Response Format:**
```json
{
  "transactions": [
    {
      "id": 456789,
      "type": "donation",
      "amount": 100.00,
      "currency": "USD",
      "contact_id": 98765,
      "campaign_id": 12345,
      "member_id": 67890,
      "status": "completed",
      "created_at": "2025-10-20T14:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 100,
    "total": 1234,
    "last_page": 13
  }
}
```

**Use Cases:**
- "Show me all donations"
- "List transactions for this campaign"

---

### Tools (Actions & Operations)

#### 1. `search_contacts`
**Purpose:** Search contacts with advanced filters

**Parameters:**
```typescript
{
  query?: string;           // Text search (name, email)
  tags?: string[];          // Filter by tags
  customFields?: {
    [key: string]: any;     // Filter by custom fields
  };
  createdAfter?: string;    // ISO date
  createdBefore?: string;   // ISO date
  limit?: number;           // Default: 100
}
```

**Response Format:**
```json
{
  "results": [
    {
      "id": 98765,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "tags": ["mentor", "donor"],
      "match_score": 0.95
    }
  ],
  "total": 12,
  "query": {
    "query": "john",
    "tags": ["mentor"]
  }
}
```

**Use Cases:**
- "Find all contacts tagged as 'mentor'"
- "Search for contacts with 'smith' in their name"
- "Show me contacts added in the last month"

---

#### 2. `update_contact_tags`
**Purpose:** Add or remove tags from a contact

**Parameters:**
```typescript
{
  contactId: number;        // Required
  tagsToAdd?: string[];     // Tags to add
  tagsToRemove?: string[];  // Tags to remove
}
```

**Response Format:**
```json
{
  "contact_id": 98765,
  "tags": ["mentor", "donor", "volunteer"],
  "added": ["volunteer"],
  "removed": [],
  "updated_at": "2025-10-25T10:00:00Z"
}
```

**Use Cases:**
- "Add 'volunteer' tag to this contact"
- "Remove 'inactive' tag from these contacts"
- "Tag all mentors as 'active'"

---

#### 3. `update_contact_custom_field`
**Purpose:** Update a custom field for a contact

**Parameters:**
```typescript
{
  contactId: number;        // Required
  fieldName: string;        // Custom field name
  value: any;               // New value
}
```

**Response Format:**
```json
{
  "contact_id": 98765,
  "field_name": "mentor_status",
  "old_value": "pending",
  "new_value": "active",
  "updated_at": "2025-10-25T10:00:00Z"
}
```

**Use Cases:**
- "Update mentor status to 'active'"
- "Set fundraising goal to $5000"
- "Mark as 'fully_fundraised'"

---

#### 4. `generate_fundraising_report`
**Purpose:** Generate comprehensive fundraising report for a campaign

**Parameters:**
```typescript
{
  campaignId: number;       // Required
  includeMembers?: boolean; // Include member breakdown (default: true)
  includeTransactions?: boolean; // Include transaction details (default: false)
  dateRange?: {
    start: string;          // ISO date
    end: string;            // ISO date
  };
}
```

**Response Format:**
```json
{
  "campaign": {
    "id": 12345,
    "title": "2025 Mentor Fundraising Campaign",
    "goal": 100000.00,
    "raised": 45000.00,
    "progress": "45%"
  },
  "summary": {
    "total_raised": 45000.00,
    "total_donors": 156,
    "total_members": 45,
    "average_donation": 288.46,
    "largest_donation": 5000.00
  },
  "top_fundraisers": [
    {
      "name": "Jane Smith",
      "raised": 8500.00,
      "donors": 34,
      "goal_progress": "170%"
    }
  ],
  "timeline": {
    "days_active": 298,
    "days_remaining": 67,
    "daily_average": 151.01,
    "projected_total": 55500.00
  },
  "recommendations": [
    "Campaign is 45% to goal with 67 days remaining",
    "Need $820/day to reach goal",
    "Top 10 fundraisers account for 65% of total"
  ]
}
```

**Use Cases:**
- "Generate a report for the mentor campaign"
- "Show me fundraising progress"
- "Analyze campaign performance"

---

#### 5. `find_contacts_by_custom_field`
**Purpose:** Find contacts matching specific custom field values

**Parameters:**
```typescript
{
  fieldName: string;        // Custom field name
  value: any;               // Value to match
  operator?: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  limit?: number;           // Max results
}
```

**Response Format:**
```json
{
  "field_name": "mentor_status",
  "value": "active",
  "operator": "equals",
  "results": [
    {
      "id": 98765,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "custom_fields": {
        "mentor_status": "active"
      }
    }
  ],
  "total": 87
}
```

**Use Cases:**
- "Find all contacts with mentor_status = 'active'"
- "Show me contacts who haven't fully fundraised"
- "List everyone with goal > $5000"

---

#### 6. `get_contact_transaction_history`
**Purpose:** Get all transactions for a specific contact

**Parameters:**
```typescript
{
  contactId: number;        // Required
  type?: string;            // Filter by transaction type
  status?: string;          // Filter by status
}
```

**Response Format:**
```json
{
  "contact_id": 98765,
  "contact_name": "John Doe",
  "transactions": [
    {
      "id": 456789,
      "type": "donation",
      "amount": 100.00,
      "campaign": "2025 Mentor Fundraising Campaign",
      "status": "completed",
      "created_at": "2025-10-20T14:30:00Z"
    }
  ],
  "summary": {
    "total_donated": 2500.00,
    "transaction_count": 5,
    "average_donation": 500.00,
    "first_donation": "2025-01-15T10:00:00Z",
    "last_donation": "2025-10-20T14:30:00Z"
  }
}
```

**Use Cases:**
- "Show me all donations from this contact"
- "What's their giving history?"
- "List transaction details for this donor"

---

### Prompts (Reusable Templates)

#### 1. `analyze_campaign_performance`
**Purpose:** Comprehensive campaign performance analysis

**Template:**
```
Analyze the campaign performance and provide insights:

1. **Progress Analysis**
   - Current vs goal
   - Trajectory vs timeline
   - Pace needed to reach goal

2. **Member Performance**
   - Top performers
   - Members needing support
   - Average per member

3. **Donor Analysis**
   - New vs returning donors
   - Average gift size
   - Donation frequency

4. **Recommendations**
   - Strategies to accelerate progress
   - Members to highlight
   - Engagement opportunities

Campaign: {{campaignId}}
Analysis Date: {{date}}
```

**Use Cases:**
- Regular campaign check-ins
- Board reporting
- Strategy planning

---

#### 2. `identify_at_risk_fundraisers`
**Purpose:** Identify campaign members who need support

**Template:**
```
Identify campaign members who may need additional support:

1. **Risk Factors**
   - Below 25% of goal
   - No donations in last 14 days
   - Zero donors
   - Not logged in recently

2. **Support Recommendations**
   - Outreach priority (high/medium/low)
   - Suggested interventions
   - Resources to share

3. **Success Stories**
   - Similar members who turned around
   - Tactics that worked

Campaign: {{campaignId}}
Evaluation Criteria: {{criteria}}
```

**Use Cases:**
- Proactive member support
- Resource allocation
- Coaching prioritization

---

## Implementation Priority

### Phase 1: Essential Resources & Tools

**Jotform (Week 1)**
1. Resources: All 5 resources
2. Tools: `search_submissions`, `export_form_data`, `get_submission_by_email`

**Givebutter (Week 2)**
1. Resources: All 6 resources
2. Tools: `search_contacts`, `update_contact_tags`, `update_contact_custom_field`

### Phase 2: Advanced Analytics (Week 3)

**Jotform**
1. Tool: `analyze_form_responses`
2. Prompt: `analyze_mentor_applications`

**Givebutter**
1. Tool: `generate_fundraising_report`
2. Tool: `find_contacts_by_custom_field`
3. Prompt: `analyze_campaign_performance`

### Phase 3: Advanced Features (Week 4)

**Jotform**
1. Tool: `get_form_webhooks`
2. Prompt: `export_for_crm`

**Givebutter**
1. Tool: `get_contact_transaction_history`
2. Prompt: `identify_at_risk_fundraisers`

---

## Testing Checklist

### Resources
- [ ] List operations return expected structure
- [ ] Pagination works correctly
- [ ] Error handling for invalid IDs
- [ ] Performance acceptable with large datasets
- [ ] Cache invalidation works properly

### Tools
- [ ] Input validation catches invalid parameters
- [ ] Success responses match specification
- [ ] Error messages are clear and actionable
- [ ] Side effects work as expected (for write operations)
- [ ] Rate limiting is respected
- [ ] Concurrent operations handled safely

### Prompts
- [ ] Variable substitution works correctly
- [ ] Prompts guide to useful outcomes
- [ ] Context provided is sufficient
- [ ] Instructions are clear and unambiguous

---

## Security Considerations

### API Keys
- Store in environment variables
- Never log API keys
- Rotate regularly
- Use separate keys for dev/prod

### Rate Limiting
- Respect API rate limits
- Implement client-side throttling
- Add backoff for rate limit errors
- Cache aggressively to reduce calls

### Data Access
- Validate all input parameters
- Sanitize output data
- Don't expose internal IDs unnecessarily
- Log all write operations

### Error Handling
- Don't leak sensitive info in errors
- Provide user-friendly error messages
- Log detailed errors server-side
- Include retry guidance when appropriate

---

## Next Steps

1. Review this specification
2. Provide feedback on tools/resources
3. Prioritize which to build first
4. Begin implementation following the roadmap
5. Test thoroughly with MCP inspector
6. Deploy and monitor usage
