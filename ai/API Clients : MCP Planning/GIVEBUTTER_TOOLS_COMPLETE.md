## Givebutter MCP Server - Complete Tool List

### Server Metadata
```typescript
{
  name: "givebutter-mcp-server",
  version: "1.0.0",
  description: "Complete access to all Givebutter API operations"
}
```

### All Tools (Direct API Client Mapping)

#### Campaign Operations

**1. `get_campaigns`**
- **Maps to:** `client.getCampaigns()`
- **Purpose:** List all campaigns
- **Parameters:** None
- **Example:** "Show me all fundraising campaigns"

**2. `get_campaign`**
- **Maps to:** `client.getCampaign(campaignId)`
- **Parameters:**
  - `campaignId` (number, required)
- **Example:** "Get details for campaign 12345"

**3. `get_campaign_by_code`**
- **Maps to:** `client.getCampaignByCode(code)`
- **Parameters:**
  - `code` (string, required)
- **Example:** "Find the 'mentor-2025' campaign"

**4. `create_campaign`** ✨ NEW
- **Maps to:** `client.createCampaign(data)`
- **Parameters:**
  - `code` (string, required)
  - `title` (string, required)
  - `description` (string, optional)
  - `goal` (number, optional)
  - `start_date` (string, optional)
  - `end_date` (string, optional)
- **Example:** "Create a new campaign for 2026 mentors"

**5. `update_campaign`** ✨ NEW
- **Maps to:** `client.updateCampaign(campaignId, data)`
- **Parameters:**
  - `campaignId` (number, required)
  - `data` (object, required) - Fields to update
- **Example:** "Update the goal for campaign 12345 to $150,000"

**6. `delete_campaign`** ✨ NEW
- **Maps to:** `client.deleteCampaign(campaignId)`
- **Parameters:**
  - `campaignId` (number, required)
- **Example:** "Delete campaign 12345"

---

#### Member Operations

**7. `get_campaign_members`**
- **Maps to:** `client.getCampaignMembers(campaignId, page, perPage)`
- **Parameters:**
  - `campaignId` (number, required)
  - `page` (number, optional, default: 1)
  - `perPage` (number, optional, default: 20, max: 100)
- **Example:** "Get members for campaign 12345"

**8. `get_all_campaign_members`**
- **Maps to:** `client.getAllCampaignMembers(campaignId)`
- **Parameters:**
  - `campaignId` (number, required)
- **Purpose:** Auto-paginated - gets ALL members
- **Example:** "Get every member in campaign 12345"

**9. `get_member`**
- **Maps to:** `client.getMember(memberId)`
- **Parameters:**
  - `memberId` (number, required)
- **Example:** "Show me member 67890"

**10. `delete_member`** ✨ NEW
- **Maps to:** `client.deleteMember(memberId)`
- **Parameters:**
  - `memberId` (number, required)
- **Example:** "Remove member 67890 from the campaign"

---

#### Team Operations

**11. `get_teams`** ✨ NEW
- **Maps to:** `client.getTeams()`
- **Purpose:** List all teams
- **Parameters:** None
- **Example:** "Show me all fundraising teams"

**12. `get_team`** ✨ NEW
- **Maps to:** `client.getTeam(teamId)`
- **Parameters:**
  - `teamId` (number, required)
- **Example:** "Get details for team 54321"

---

#### Contact Operations

**13. `get_contacts`**
- **Maps to:** `client.getContacts(page, perPage)`
- **Parameters:**
  - `page` (number, optional, default: 1)
  - `perPage` (number, optional, default: 20, max: 100)
- **Example:** "Get the first page of contacts"

**14. `get_all_contacts`**
- **Maps to:** `client.getAllContacts()`
- **Purpose:** Auto-paginated - gets ALL contacts
- **Parameters:** None
- **Example:** "Get every contact in the database"

**15. `get_contact`**
- **Maps to:** `client.getContact(contactId)`
- **Parameters:**
  - `contactId` (number, required)
- **Example:** "Show me contact 98765"

**16. `create_contact`** ✨ NEW
- **Maps to:** `client.createContact(data)`
- **Parameters:**
  - `first_name` (string, required)
  - `last_name` (string, required)
  - `email` (string, required)
  - `phone` (string, optional)
  - `external_id` (string, optional)
  - `tags` (array, optional)
  - `custom_fields` (object, optional)
  - ... other contact fields
- **Example:** "Create a new contact for Jane Smith"

**17. `update_contact`** ✨ NEW
- **Maps to:** `client.updateContact(contactId, data)`
- **Parameters:**
  - `contactId` (number, required)
  - `data` (object, required) - Fields to update
- **Example:** "Update contact 98765's email address"

**18. `archive_contact`**
- **Maps to:** `client.archiveContact(contactId)`
- **Parameters:**
  - `contactId` (number, required)
- **Example:** "Archive contact 98765"

**19. `restore_contact`** ✨ NEW
- **Maps to:** `client.restoreContact(contactId)`
- **Parameters:**
  - `contactId` (number, required)
- **Example:** "Restore archived contact 98765"

---

#### Transaction Operations

**20. `get_transactions`**
- **Maps to:** `client.getTransactions(page, perPage, filters)`
- **Parameters:**
  - `page` (number, optional, default: 1)
  - `perPage` (number, optional, default: 20, max: 100)
  - `filters` (object, optional)
    - `campaign_id` (number)
    - `member_id` (number)
    - `contact_id` (number)
    - `type` (string)
    - `status` (string)
- **Example:** "Get transactions for campaign 12345"

**21. `get_all_transactions`**
- **Maps to:** `client.getAllTransactions(filters)`
- **Parameters:**
  - `filters` (object, optional) - Same as get_transactions
- **Purpose:** Auto-paginated - gets ALL transactions
- **Example:** "Get all donations for this campaign"

---

#### API Key Verification

**22. `verify_api_key`**
- **Maps to:** `client.verifyApiKey()`
- **Purpose:** Test if API key is valid
- **Parameters:** None
- **Example:** "Is my Givebutter API key working?"

---

### Total: 22 Tools

- **Existing in client:** 13 tools
- **Need to add:** 9 tools ✨
  - create_campaign
  - update_campaign
  - delete_campaign
  - delete_member
  - get_teams
  - get_team
  - create_contact
  - update_contact
  - restore_contact

---

### Example Usage with Claude Code

**Scenario 1: Archive a specific mentor**
```
You: Archive mentor John Doe from Givebutter

Claude Code uses:
1. get_all_contacts()
2. Searches for name = "John Doe"
3. archive_contact(contactId)

Result: "Contact 'John Doe' (ID: 98765) has been archived"
```

**Scenario 2: Check fundraising progress**
```
You: How many mentors have fully fundraised in the 2025 campaign?

Claude Code uses:
1. get_campaign_by_code("mentor-2025")
2. get_all_campaign_members(campaignId)
3. Filters members where raised >= goal

Result: "23 out of 45 mentors (51%) have reached their goal"
```

**Scenario 3: Verify numbers make sense**
```
You: Check if the total raised across all members equals the campaign total

Claude Code uses:
1. get_campaign_by_code("mentor-2025")
2. get_all_campaign_members(campaignId)
3. Sums member.raised
4. Compares to campaign.raised

Result: "✓ Numbers match: Campaign shows $45,000, sum of members is $45,000"
```

**Scenario 4: Find contact by custom field**
```
You: Find all contacts with mentor_status = "active"

Claude Code uses:
1. get_all_contacts()
2. Filters custom_fields.mentor_status === "active"

Result: "Found 87 contacts with mentor_status = 'active'"
```

**Scenario 5: Update mentor tag**
```
You: Tag contact 98765 as "fully_fundraised"

Claude Code uses:
1. get_contact(98765) -> gets current tags
2. update_contact(98765, { tags: [...existing, "fully_fundraised"] })

Result: "Contact 98765 has been tagged as 'fully_fundraised'"
```
