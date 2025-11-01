
# Givebutter API — FULL Response Bodies for 5 Categories (LLM Context)

Covers every function in your screenshot across **five categories**:
**Overview (Auth/Errors/Pagination)**, **Campaigns**, **Campaign Members**, **Campaign Teams**, **Contacts**.

For each **GET** endpoint, this file includes the **complete response body**:
- **List endpoints** → a pagination **envelope** (`data[]`, `links`, `meta`) **plus** the full **object schema** for each element.
- **Single endpoints** → envelope `{ "data": Object }` **plus** the full **object schema**.
For create/update/restore/delete, shape is noted; object fields are defined by the linked object schemas.

---

## 0) Overview

### 0.1 Authentication
Send API key with every call:
```
Authorization: Bearer <API_KEY>
```
HTTPS required.

### 0.2 Errors
Standard HTTP status codes (400, 401, 403, 404, 405, 500).

### 0.3 Pagination (envelope used by list endpoints)
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
    "links": [
      { "url": null, "label": "« Previous", "active": false },
      { "url": "https://api.givebutter.com/v1/<resource>?page=1", "label": "1", "active": true }
    ],
    "path": "https://api.givebutter.com/v1/<resource>",
    "per_page": 20,
    "to": 20,
    "total": 100
  }
}
```

---

## 1) Campaigns

### 1.1 The Campaign Object (reference)
Representative (not exhaustive) fields you will see inside campaign responses:
- `id` (integer) — campaign ID
- `type` (string) — `general` | `collect` | `fundraise` | `event`
- `status` (string) — `active` | `inactive` | `unpublished`
- `title`, `subtitle`, `description` (HTML), `slug`
- `goal` (integer), `raised` (integer), `donors` (integer)
- `end_at` (string, ISO-8601), `url` (string), `currency` (string)
- `cover` (object), `meta` (object), `account_id` (integer)
- `created_at` (string), `updated_at` (string)

> If you want the exhaustive field-by-field table for campaigns added here, say the word and I’ll expand this section to a full table just like Contacts/Members/Teams below.

#### 1.2 Get Campaigns — `GET /campaigns` (Response 200)
**Envelope + elements are Campaign objects (see above):**
```json
{
  "data": [ { /* Campaign */ } ],
  "links": { "first": "string", "last": "string", "prev": "string", "next": "string" },
  "meta":  { "current_page": 0, "from": 0, "last_page": 0, "links": [ { "url": "string", "label": "string", "active": true } ], "path": "string", "per_page": 0, "to": 0, "total": 0 }
}
```

#### 1.3 Get a Campaign — `GET /campaigns/{id}` (Response 200)
**Single-resource wrapper:**
```json
{ "data": { /* Campaign */ } }
```

#### 1.4 Create a Campaign — `POST /campaigns` (Response 200/201)
```json
{ "data": { /* Campaign (created) */ } }
```

#### 1.5 Update a Campaign — `PATCH /campaigns/{id}` (Response 200)
```json
{ "data": { /* Campaign (updated) */ } }
```

#### 1.6 Delete a Campaign — `DELETE /campaigns/{id}` (Response 204 or empty body)
No content on success; error if funds were raised.

---

## 2) Campaign Members

### 2.1 The Member Object (FULL schema)

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

#### 2.2 Get Members — `GET /campaigns/{campaign_id}/members` (Response 200)
**Envelope (list) + full element schema (above):**
```json
{
  "data": [
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
  ],
  "links": {
    "first": "string",
    "last": "string",
    "prev": "string",
    "next": "string"
  },
  "meta": {
    "current_page": 0,
    "from": 0,
    "last_page": 0,
    "links": [ { "url": "string", "label": "string", "active": true } ],
    "path": "string",
    "per_page": 0,
    "to": 0,
    "total": 0
  }
}
```

#### 2.3 Get a Member — `GET /campaigns/{campaign_id}/members/{member_id}` (Response 200)
**Single-resource wrapper + full object schema:**
```json
{
  "data": {
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
}
```

#### 2.4 Delete a Member — `DELETE /campaigns/{campaign_id}/members/{member_id}` (Response 204 or empty body)
No content on success.

---

## 3) Campaign Teams

### 3.1 The Team Object (FULL schema)
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

#### 3.2 Get Teams — `GET /campaigns/{campaign_id}/teams` (Response 200)
**Envelope (list) + full element schema (above):**
```json
{
  "data": [
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
  ],
  "links": {
    "first": "string",
    "last": "string",
    "prev": "string",
    "next": "string"
  },
  "meta": {
    "current_page": 0,
    "from": 0,
    "last_page": 0,
    "links": [ { "url": "string", "label": "string", "active": true } ],
    "path": "string",
    "per_page": 0,
    "to": 0,
    "total": 0
  }
}
```

#### 3.3 Get a Team — `GET /campaigns/{campaign_id}/teams/{team_id}` (Response 200)
**Single-resource wrapper + full object schema:**
```json
{
  "data": {
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
}
```

---

## 4) Contacts

### 4.1 The Contact Object (FULL schema for single resource)
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
  "emails": [ { "type": "string", "value": "string" } ],
  "phones": [ { "type": "string", "value": "string" } ],
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
      "type": "string",
      "is_primary": 0,
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "primary_address": {
    "address_1": "string",
    "address_2": "string",
    "city": "string",
    "state": "string",
    "zipcode": "string",
    "country": "string",
    "type": "string",
    "is_primary": 0,
    "created_at": "string",
    "updated_at": "string"
  },
  "stats": {
    "recurring_contributions": 0,
    "total_contributions": 0
  },
  "tags": [ "string" ],
  "custom_fields": [],
  "archived_at": "string",
  "created_at": "string",
  "updated_at": "string"
}
```

#### 4.2 Get Contacts — `GET /contacts` (Response 200)
**Envelope (list) + element schema (Contact objects):**
```json
{
  "data": [
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
      "emails": [ { "type": "string", "value": "string" } ],
      "phones": [ { "type": "string", "value": "string" } ],
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
          "type": "string",
          "is_primary": 0,
          "created_at": "string",
          "updated_at": "string"
        }
      ],
      "primary_address": {},
      "stats": {},
      "tags": [ "string" ],
      "custom_fields": [],
      "archived_at": "string",
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "links": {
    "first": "string",
    "last": "string",
    "prev": "string",
    "next": "string"
  },
  "meta": {
    "current_page": 0,
    "from": 0,
    "last_page": 0,
    "links": [ { "url": "string", "label": "string", "active": true } ],
    "path": "string",
    "per_page": 0,
    "to": 0,
    "total": 0
  }
}
```

#### 4.3 Get a Contact — `GET /contacts/{id}` (Response 200)
**Single-resource wrapper + full object schema:**
```json
{ "data": { /* Contact (see full schema above) */ } }
```

#### 4.4 Create a Contact — `POST /contacts` (Response 200/201)
```json
{ "data": { /* Contact (created) — same schema as single */ } }
```

#### 4.5 Update Contact — `PATCH /contacts/{id}` (Response 200)
```json
{ "data": { /* Contact (updated) — same schema as single */ } }
```

#### 4.6 Archive a Contact — `DELETE /contacts/{id}` (Response 204 or empty body)
No content on success.

#### 4.7 Restore a Contact — `PATCH /contacts/{id}/restore` (Response 200)
```json
{ "data": { /* Contact (restored) — same schema as single */ } }
```

---

### Notes for LLM usage
- Treat list vs single **envelopes** as authoritative for parsing.
- The object schemas above can be reused for create/update/restore responses (they return the resource).
