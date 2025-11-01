# Jotform API Documentation

Official API documentation for Jotform form builder and data management.

## Overview

The Jotform API is a RESTful API that enables programmatic access to form data, submissions, and account management. It makes it possible to connect to your form data without using the Jotform website.

## Official Resources

- **Main API Documentation**: https://api.jotform.com/docs/
- **Developers Portal**: https://www.jotform.com/developers/
- **API Libraries**: https://www.jotform.com/developers/libraries/
- **API Key Generation**: https://www.jotform.com/help/253-how-to-create-a-jotform-api-key/

## Base URLs

### Standard API
```
https://api.jotform.com
```

### EU API
```
https://eu-api.jotform.com
```

### HIPAA API
```
https://hipaa-api.jotform.com
```

### Versioned Endpoint
```
https://api.jotform.com/v1
```

## Authentication

### Method 1: Query Parameter
```
GET https://api.jotform.com/user?apiKey=YOUR_API_KEY
```

### Method 2: Header (Recommended)
```
APIKEY: YOUR_API_KEY
```

## Available SDKs

Ready-to-use SDKs available in 11 languages:
- Android
- C#
- GO
- iOS
- Java
- JavaScript
- Node.js
- PHP
- Python
- Ruby
- Scala

## Core Endpoints

### User Management

**Get User Information**
```
GET /user
```

**List User's Forms**
```
GET /user/forms
```

**Get Account Settings**
```
GET /user/settings
```

**Update Settings**
```
POST /user/settings
```

**Check API Usage**
```
GET /user/usage
```

**User Login**
```
POST /user/login
```

**User Logout**
```
GET /user/logout
```

### Form Operations

**Get Form Details**
```
GET /form/{formID}
```

**Get Form Submissions**
```
GET /form/{formID}/submissions
```

**Create Submission**
```
POST /form/{formID}/submissions
```

**Get Form Questions**
```
GET /form/{formID}/questions
```

**Add Question**
```
POST /form/{formID}/questions
```

**Clone Form**
```
POST /form/{formID}/clone
```

### Submission Management

**Get Single Submission**
```
GET /submission/{submissionID}
```

**Update Submission**
```
POST /submission/{submissionID}
```
Example payload:
```
submission[1_first]=Johny
```

**Delete Submission**
```
DELETE /submission/{submissionID}
```

### Webhooks

**List Webhooks**
```
GET /form/{formID}/webhooks
```

**Create Webhook**
```
POST /form/{formID}/webhooks
```

**Delete Webhook**
```
DELETE /form/{formID}/webhooks/{webhookID}
```

## Request Formats

The API supports:
- **URL-encoded** form data
- **JSON** payloads for PUT/POST operations

Example URL-encoded:
```
submission[1_first]=Johny&submission[2_last]=Doe
```

Example JSON:
```json
{
  "submission": {
    "1_first": "Johny",
    "2_last": "Doe"
  }
}
```

## Response Structure

All responses include:

1. **Response Body**: JSON data
2. **Response Code**: HTTP status code
3. **Response Headers**: Metadata
4. **Request URL**: For debugging

Example response:
```json
{
  "responseCode": 200,
  "content": {
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

## Rate Limits

- API usage tracking available via `/user/usage` endpoint
- Specific rate limits vary by account type
- Check usage regularly to avoid throttling

## Common Use Cases

### 1. Retrieve Form Submissions
```bash
curl -X GET "https://api.jotform.com/form/123456789/submissions" \
  -H "APIKEY: YOUR_API_KEY"
```

### 2. Create New Submission
```bash
curl -X POST "https://api.jotform.com/form/123456789/submissions" \
  -H "APIKEY: YOUR_API_KEY" \
  -d "submission[1]=John" \
  -d "submission[2]=Doe"
```

### 3. Get Form Questions
```bash
curl -X GET "https://api.jotform.com/form/123456789/questions" \
  -H "APIKEY: YOUR_API_KEY"
```

### 4. Setup Webhook
```bash
curl -X POST "https://api.jotform.com/form/123456789/webhooks" \
  -H "APIKEY: YOUR_API_KEY" \
  -d "webhookURL=https://your-server.com/webhook"
```

## Field Naming Convention

Form fields are identified by their question ID:
- `1` - First Name
- `2` - Last Name
- `3` - Email
- etc.

Access via `submission[{questionID}]` format.

## Best Practices

1. **Use Headers for Auth**: More secure than query parameters
2. **Check Usage**: Monitor API usage to avoid rate limits
3. **Handle Errors**: Always check response codes
4. **Cache When Possible**: Reduce unnecessary API calls
5. **Use Webhooks**: For real-time updates instead of polling

## Error Handling

Standard HTTP status codes:
- `200` - Success
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Server Error

## Security Notes

- **Never expose API keys** in client-side code
- Store API keys in environment variables
- Use HTTPS for all requests
- Rotate API keys periodically
- Use EU/HIPAA endpoints for compliance when required

## MCP Server

This project includes a custom Jotform MCP server with 19 tools:

See `/dep docs/ac-mcp/README.md` for:
- Setup instructions
- Available tools
- Docker configuration
- Usage examples

## Additional Resources

- **Help Center**: https://www.jotform.com/help/
- **Support**: Available through Jotform account
- **Community**: Jotform forums and developer community
- **Status Page**: Check API status and incidents
