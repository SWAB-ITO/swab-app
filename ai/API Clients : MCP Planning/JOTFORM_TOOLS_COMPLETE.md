## Jotform MCP Server - Complete Tool List

### Server Metadata
```typescript
{
  name: "jotform-mcp-server",
  version: "1.0.0",
  description: "Complete access to all Jotform API operations"
}
```

### All Tools (Direct API Client Mapping)

#### User Operations

**1. `get_user`**
- **Maps to:** `client.getUser()`
- **Purpose:** Get user profile information
- **Parameters:** None
- **Example:** "Show me my Jotform account info"

---

#### Form Operations

**2. `get_forms`**
- **Maps to:** `client.getForms()`
- **Purpose:** List all forms
- **Parameters:** None
- **Example:** "List all my forms"

**3. `get_form`**
- **Maps to:** `client.getForm(formId)`
- **Parameters:**
  - `formId` (string, required)
- **Example:** "Get details for form 231234567890"

**4. `get_form_questions`**
- **Maps to:** `client.getFormQuestions(formId)`
- **Parameters:**
  - `formId` (string, required)
- **Example:** "What questions are on form 231234567890?"

**5. `get_form_properties`**
- **Maps to:** `client.getFormProperties(formId)`
- **Parameters:**
  - `formId` (string, required)
- **Example:** "Show me the settings for this form"

**6. `create_form`** ✨ NEW
- **Maps to:** `client.createForm(properties)`
- **Parameters:**
  - `title` (string, required)
  - `questions` (array, optional)
  - `properties` (object, optional)
- **Example:** "Create a new form called 'Volunteer Application'"

**7. `update_form`** ✨ NEW
- **Maps to:** `client.updateForm(formId, properties)`
- **Parameters:**
  - `formId` (string, required)
  - `properties` (object, required)
- **Example:** "Update the thank you URL for form 231234567890"

**8. `delete_form`** ✨ NEW
- **Maps to:** `client.deleteForm(formId)`
- **Parameters:**
  - `formId` (string, required)
- **Example:** "Delete form 231234567890"

---

#### Submission Operations

**9. `get_form_submissions`**
- **Maps to:** `client.getFormSubmissions(formId, options)`
- **Parameters:**
  - `formId` (string, required)
  - `limit` (number, optional, default: 1000)
  - `offset` (number, optional)
  - `filter` (object, optional)
  - `orderBy` (string, optional)
- **Example:** "Get the first 100 submissions for form 231234567890"

**10. `get_all_form_submissions`**
- **Maps to:** `client.getAllFormSubmissions(formId)`
- **Parameters:**
  - `formId` (string, required)
- **Purpose:** Auto-paginated - gets ALL submissions
- **Example:** "Get every single submission for form 231234567890"

**11. `get_submission`**
- **Maps to:** `client.getSubmission(submissionId)`
- **Parameters:**
  - `submissionId` (string, required)
- **Example:** "Show me submission 6234567890123456789"

**12. `create_submission`** ✨ NEW
- **Maps to:** `client.createSubmission(formId, submission)`
- **Parameters:**
  - `formId` (string, required)
  - `submission` (object, required) - Field ID to value mapping
- **Example:** "Submit a new response to form 231234567890"

**13. `update_submission`** ✨ NEW
- **Maps to:** `client.updateSubmission(submissionId, submission)`
- **Parameters:**
  - `submissionId` (string, required)
  - `submission` (object, required)
- **Example:** "Update submission 6234567890123456789"

**14. `delete_submission`** ✨ NEW
- **Maps to:** `client.deleteSubmission(submissionId)`
- **Parameters:**
  - `submissionId` (string, required)
- **Example:** "Delete submission 6234567890123456789"

---

#### Webhook Operations

**15. `get_form_webhooks`**
- **Maps to:** `client.getFormWebhooks(formId)` (currently `getFormReports` - needs fix)
- **Parameters:**
  - `formId` (string, required)
- **Example:** "What webhooks are configured for form 231234567890?"

**16. `create_webhook`** ✨ NEW
- **Maps to:** `client.createWebhook(formId, webhookURL)`
- **Parameters:**
  - `formId` (string, required)
  - `webhookURL` (string, required)
- **Example:** "Add a webhook to form 231234567890 pointing to https://api.example.com/webhook"

**17. `delete_webhook`** ✨ NEW
- **Maps to:** `client.deleteWebhook(formId, webhookId)`
- **Parameters:**
  - `formId` (string, required)
  - `webhookId` (string, required)
- **Example:** "Remove webhook 123456 from form 231234567890"

---

#### API Key Verification

**18. `verify_api_key`**
- **Maps to:** `client.verifyApiKey()`
- **Purpose:** Test if API key is valid
- **Parameters:** None
- **Example:** "Is my Jotform API key working?"

---

### Total: 18 Tools

- **Existing in client:** 10 tools
- **Need to add:** 8 tools ✨
  - create_form
  - update_form
  - delete_form
  - create_submission
  - update_submission
  - delete_submission
  - create_webhook
  - delete_webhook

---

### Example Usage with Claude Code

**Scenario 1: Check mentor application submissions**
```
You: How many people have submitted the mentor application form today?

Claude Code uses:
1. get_forms() -> finds "Mentor Application"
2. get_all_form_submissions(formId) with filter
3. Counts submissions from today

Result: "15 people submitted the mentor application form today"
```

**Scenario 2: Find a specific submission**
```
You: Did john@example.com submit the mentor form?

Claude Code uses:
1. get_forms() -> finds "Mentor Application"
2. get_all_form_submissions(formId)
3. Searches answers for email = "john@example.com"

Result: "Yes, John Doe submitted on 2025-10-20 (submission ID: 6234567890123456789)"
```

**Scenario 3: Clean up old form**
```
You: Delete the old 2024 mentor form

Claude Code uses:
1. get_forms() -> finds form with "2024 mentor" in title
2. delete_form(formId)

Result: "Form '2024 Mentor Application' has been deleted"
```
