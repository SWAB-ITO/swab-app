# Givebutter API Documentation

Official API documentation for Givebutter fundraising platform.

## Overview

The Givebutter API is a RESTful API that provides a stateless interface for interacting with your Givebutter account. It exclusively uses JSON for both requests and responses, enabling programmatic access to campaigns, members, contacts, transactions, and more.

## Official Resources

- **API Documentation**: https://docs.givebutter.com/reference/reference-getting-started
- **Authentication**: https://docs.givebutter.com/reference/authentication
- **Help Center**: https://help.givebutter.com/en/collections/2214077-integrations-api
- **API Key Guide**: https://help.givebutter.com/en/articles/5489015-how-to-access-the-givebutter-public-api-key
- **Integrations**: https://givebutter.com/integrations

## Base URL

```
https://api.givebutter.com/v1
```

## Authentication

### Bearer Token Authentication

All API requests require an API key sent as a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

### Requirements

- **HTTPS Only**: All requests must use HTTPS
- **Admin Access**: API keys require admin access to your Givebutter account
- **Location**: Access API keys from the Integrations tab in your dashboard

### Example Request

```bash
curl -X GET "https://api.givebutter.com/v1/campaigns" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Response Format

### Standard Envelope Structure

**List Endpoints** (paginated):
```json
{
  "data": [ /* array of resources */ ],
  "links": {
    "first": "https://api.givebutter.com/v1/<resource>?page=1",
    "last": "https://api.givebutter.com/v1/<resource>?page=N",
    "prev": null,
    "next": "https://api.givebutter.com/v1/<resource>?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "path": "https://api.givebutter.com/v1/<resource>",
    "per_page": 20,
    "to": 20,
    "total": 100
  }
}
```

**Single Resource Endpoints**:
```json
{
  "data": { /* single resource object */ }
}
```

## Pagination

All list endpoints return paginated results with:
- Default: 20 items per page
- Navigation via `links.next` and `links.prev`
- Metadata in `meta` object

Query parameters:
```
?page=2
?per_page=50
```

## Error Handling

Standard HTTP status codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Server Error

---

## Available Endpoints

## 1. Campaigns

### Campaign Object Schema

```json
{
  "id": 0,
  "type": "general | collect | fundraise | event",
  "status": "active | inactive | unpublished",
  "title": "string",
  "subtitle": "string",
  "description": "string (HTML)",
  "slug": "string",
  "goal": 0,
  "raised": 0,
  "donors": 0,
  "end_at": "2025-12-31T23:59:59Z",
  "url": "string",
  "currency": "USD",
  "cover": {},
  "meta": {},
  "account_id": 0,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Get Campaigns

```
GET /campaigns
```

Returns paginated list of campaigns.

**Response 200:**
```json
{
  "data": [ /* Campaign objects */ ],
  "links": { /* pagination links */ },
  "meta": { /* pagination metadata */ }
}
```

### Get a Campaign

```
GET /campaigns/{id}
```

Returns a single campaign.

**Response 200:**
```json
{
  "data": { /* Campaign object */ }
}
```

### Create Campaign

```
POST /campaigns
```

Creates a new campaign.

**Request Body:**
```json
{
  "title": "Spring Fundraiser 2025",
  "type": "fundraise",
  "goal": 50000,
  "description": "<p>Help us reach our goal</p>"
}
```

**Response 200/201:**
```json
{
  "data": { /* Created Campaign object */ }
}
```

### Update Campaign

```
PATCH /campaigns/{id}
```

Updates an existing campaign.

**Response 200:**
```json
{
  "data": { /* Updated Campaign object */ }
}
```

### Delete Campaign

```
DELETE /campaigns/{id}
```

Deletes a campaign (only if no funds raised).

**Response 204:** No content on success

---

## 2. Campaign Members

### Member Object Schema

```json
{
  "id": 0,
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "picture": "string",
  "raised": 0,
  "goal": 0,
  "donors": 0,
  "items": 0,
  "url": "string"
}
```

### Get Members

```
GET /campaigns/{campaign_id}/members
```

Returns paginated list of campaign members.

**Response 200:**
```json
{
  "data": [ /* Member objects */ ],
  "links": { /* pagination */ },
  "meta": { /* metadata */ }
}
```

### Get a Member

```
GET /campaigns/{campaign_id}/members/{member_id}
```

Returns a single member.

**Response 200:**
```json
{
  "data": { /* Member object */ }
}
```

### Delete Member

```
DELETE /campaigns/{campaign_id}/members/{member_id}
```

Removes a member from the campaign.

**Response 204:** No content on success

---

## 3. Campaign Teams

### Team Object Schema

```json
{
  "id": 0,
  "name": "string",
  "logo": "string",
  "slug": "string",
  "url": "string",
  "raised": 0,
  "goal": 0,
  "supporters": 0,
  "members": 0
}
```

### Get Teams

```
GET /campaigns/{campaign_id}/teams
```

Returns paginated list of campaign teams.

**Response 200:**
```json
{
  "data": [ /* Team objects */ ],
  "links": { /* pagination */ },
  "meta": { /* metadata */ }
}
```

### Get a Team

```
GET /campaigns/{campaign_id}/teams/{team_id}
```

Returns a single team.

**Response 200:**
```json
{
  "data": { /* Team object */ }
}
```

---

## 4. Contacts

### Contact Object Schema

```json
{
  "id": 0,
  "first_name": "string",
  "middle_name": "string",
  "last_name": "string",
  "dob": "string",
  "company": "string",
  "title": "string",
  "twitter_url": "string",
  "linkedin_url": "string",
  "facebook_url": "string",
  "emails": [
    {
      "type": "personal | work | other",
      "value": "email@example.com"
    }
  ],
  "phones": [
    {
      "type": "mobile | home | work",
      "value": "+1234567890"
    }
  ],
  "primary_email": "string",
  "primary_phone": "string",
  "note": "string",
  "addresses": [
    {
      "address_1": "string",
      "address_2": "string",
      "city": "string",
      "state": "string",
      "zipcode": "string",
      "country": "string",
      "type": "home | work | other",
      "is_primary": 0,
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "primary_address": { /* Address object */ },
  "stats": {
    "recurring_contributions": 0,
    "total_contributions": 0
  },
  "tags": ["mentor", "2025"],
  "custom_fields": [],
  "archived_at": null,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### Get Contacts

```
GET /contacts
```

Returns paginated list of contacts.

**Response 200:**
```json
{
  "data": [ /* Contact objects */ ],
  "links": { /* pagination */ },
  "meta": { /* metadata */ }
}
```

### Get a Contact

```
GET /contacts/{id}
```

Returns a single contact.

**Response 200:**
```json
{
  "data": { /* Contact object */ }
}
```

### Create Contact

```
POST /contacts
```

Creates a new contact.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "emails": [
    {
      "type": "personal",
      "value": "john@example.com"
    }
  ],
  "tags": ["mentor", "2025"]
}
```

**Response 200/201:**
```json
{
  "data": { /* Created Contact object */ }
}
```

### Update Contact

```
PATCH /contacts/{id}
```

Updates an existing contact.

**Response 200:**
```json
{
  "data": { /* Updated Contact object */ }
}
```

### Archive Contact

```
DELETE /contacts/{id}
```

Archives a contact (soft delete).

**Response 204:** No content on success

### Restore Contact

```
PATCH /contacts/{id}/restore
```

Restores an archived contact.

**Response 200:**
```json
{
  "data": { /* Restored Contact object */ }
}
```

---

## 5. Additional Resources

### Tickets

```
GET /tickets
GET /tickets/{id}
```

Retrieve event ticket data.

### Transactions

```
GET /transactions
POST /transactions
```

Create and query transaction records with filtering.

### Payouts

```
GET /payouts
```

Access payout information.

### Plans

```
GET /plans
```

Retrieve subscription plan details.

### Funds

```
GET /funds
GET /funds/{id}
```

Complete fund management operations.

---

## Common Use Cases

### 1. List All Active Campaigns

```bash
curl -X GET "https://api.givebutter.com/v1/campaigns?status=active" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 2. Get Campaign Members

```bash
curl -X GET "https://api.givebutter.com/v1/campaigns/123/members" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Create a New Contact

```bash
curl -X POST "https://api.givebutter.com/v1/contacts" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "emails": [{"type": "personal", "value": "jane@example.com"}]
  }'
```

### 4. Archive a Contact

```bash
curl -X DELETE "https://api.givebutter.com/v1/contacts/456" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 5. Get All Contacts with Pagination

```bash
# Page 1
curl -X GET "https://api.givebutter.com/v1/contacts?page=1&per_page=50" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Page 2 (use links.next from response)
curl -X GET "https://api.givebutter.com/v1/contacts?page=2&per_page=50" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## Best Practices

1. **Authentication Security**
   - Never expose API keys in client-side code
   - Store API keys in environment variables
   - Rotate keys periodically
   - Restrict access to admin users only

2. **Rate Limiting**
   - Implement exponential backoff for retries
   - Cache frequently accessed data
   - Use pagination efficiently

3. **Error Handling**
   - Always check response status codes
   - Parse error messages from response body
   - Log errors for debugging

4. **Pagination**
   - Use `links.next` for sequential pagination
   - Set appropriate `per_page` values (max varies by endpoint)
   - Track `meta.total` for progress indicators

5. **Data Integrity**
   - Validate data before sending
   - Handle soft deletes (archived contacts)
   - Use PATCH for partial updates

6. **Testing**
   - Test in a development environment first
   - Use separate API keys for development/production
   - Verify webhook endpoints before deployment

---

## MCP Server

This project includes a custom Givebutter MCP server with 22 tools for:
- Campaigns (6 tools)
- Members (4 tools)
- Teams (2 tools)
- Contacts (7 tools)
- Transactions (2 tools)
- Utilities (1 tool)

See `/dep docs/ac-mcp/README.md` for:
- Setup instructions
- Docker configuration
- Available tools and usage examples
- Integration with Claude Code

---

## Additional Resources

- **Community**: https://community.givebutter.com/
- **Support**: Available through help center
- **Status**: Check platform status for API availability
- **Changelog**: https://community.givebutter.com/changelog

---

## Quick Reference

| Resource | List Endpoint | Single Endpoint | Create | Update | Delete |
|----------|---------------|-----------------|--------|--------|--------|
| Campaigns | GET /campaigns | GET /campaigns/{id} | POST /campaigns | PATCH /campaigns/{id} | DELETE /campaigns/{id} |
| Members | GET /campaigns/{c}/members | GET /campaigns/{c}/members/{m} | - | - | DELETE /campaigns/{c}/members/{m} |
| Teams | GET /campaigns/{c}/teams | GET /campaigns/{c}/teams/{t} | - | - | - |
| Contacts | GET /contacts | GET /contacts/{id} | POST /contacts | PATCH /contacts/{id} | DELETE /contacts/{id} |

**Note:** {c} = campaign_id, {m} = member_id, {t} = team_id
