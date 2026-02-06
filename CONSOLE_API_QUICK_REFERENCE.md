# Console API Quick Reference

**Last Updated**: 2026-02-05

Quick reference for developers working with the Console API.

---

## Authentication

### Required Header

```bash
X-API-Key: <your-api-key>
# OR
Authorization: Bearer <your-api-key>
```

### Requirements
- Minimum 32 characters
- Currently accepts any valid-format key (demo mode)
- Future: Database validation required

### Example

```bash
curl -H "X-API-Key: 12345678901234567890123456789012" \
  http://localhost:3000/api/v2/console/metrics/usage
```

---

## Rate Limits

| Limit | Window | Tracking |
|-------|--------|----------|
| 100 requests | 1 minute | Per API key |

### Headers

Response includes rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1738765289
```

### Rate Limit Exceeded (429)

```json
{
  "statusCode": 429,
  "message": "You have exceeded the rate limit. Please try again later.",
  "error": "Too Many Requests",
  "timestamp": "2026-02-05T13:40:29.070Z",
  "path": "/api/v2/console/metrics/quota",
  "requestId": "req-2v",
  "retryAfter": 60
}
```

**Action**: Wait `retryAfter` seconds before retrying.

---

## Error Responses

### Standard Format

All errors follow this structure:

```typescript
{
  statusCode: number,        // HTTP status code
  message: string,           // Human-readable message
  error: string,             // Error type
  timestamp: string,         // ISO 8601 timestamp
  path: string,              // Request path
  requestId?: string,        // Unique request ID
  retryAfter?: number,       // Seconds to wait (429 only)
  details?: any              // Validation details (400 only)
}
```

### Common Errors

**401 Unauthorized** - Missing or invalid API key:
```json
{
  "statusCode": 401,
  "message": "API key is missing. Please provide X-API-Key header.",
  "error": "Unauthorized",
  "timestamp": "2026-02-05T13:40:27.955Z",
  "path": "/api/v2/console/metrics/usage",
  "requestId": "req-1"
}
```

**404 Not Found** - Invalid endpoint:
```json
{
  "statusCode": 404,
  "message": "Cannot GET /api/v2/nonexistent",
  "error": "Not Found",
  "timestamp": "2026-02-05T13:40:27.971Z",
  "path": "/api/v2/nonexistent",
  "requestId": "req-2"
}
```

**429 Too Many Requests** - Rate limit exceeded:
```json
{
  "statusCode": 429,
  "message": "You have exceeded the rate limit. Please try again later.",
  "error": "Too Many Requests",
  "timestamp": "2026-02-05T13:40:29.070Z",
  "path": "/api/v2/console/metrics/quota",
  "requestId": "req-2v",
  "retryAfter": 60
}
```

---

## Endpoints

All endpoints require API key authentication and are rate limited.

### 1. Usage Metrics

```bash
GET /api/v2/console/metrics/usage
```

**Query Parameters**:
- `period` (optional): `hourly`, `daily`, `weekly`, `monthly`
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `endpoint` (optional): Filter by endpoint

**Example**:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "http://localhost:3000/api/v2/console/metrics/usage?period=daily"
```

### 2. Endpoint Statistics

```bash
GET /api/v2/console/metrics/endpoints
```

**Query Parameters**:
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Example**:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  http://localhost:3000/api/v2/console/metrics/endpoints
```

### 3. Error Logs

```bash
GET /api/v2/console/metrics/errors
```

**Query Parameters**:
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (max: 1000, default: 100)

**Example**:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  "http://localhost:3000/api/v2/console/metrics/errors?page=1&limit=50"
```

### 4. Quota Information

```bash
GET /api/v2/console/metrics/quota
```

**No parameters required.**

**Example**:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  http://localhost:3000/api/v2/console/metrics/quota
```

**Response**:
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "apiKeyId": "550e8400-e29b-41d4-a716-446655440001",
  "quota": {
    "monthlyQuota": 10000,
    "usedRequests": 142,
    "remainingRequests": 9858,
    "usagePercentage": 1.42,
    "resetDate": "2026-02-28T15:00:00.000Z",
    "isExceeded": false
  },
  "stats": {
    "todayRequests": 12,
    "thisWeekRequests": 85,
    "thisMonthRequests": 142
  }
}
```

### 5. Real-time Metrics (SSE)

```bash
GET /api/v2/console/metrics/realtime
```

**Server-Sent Events stream.** Updates every 5 seconds.

**Example (curl)**:
```bash
curl -N -H "X-API-Key: YOUR_KEY" \
  http://localhost:3000/api/v2/console/metrics/realtime
```

**Example (JavaScript)**:
```javascript
const eventSource = new EventSource(
  'http://localhost:3000/api/v2/console/metrics/realtime',
  {
    headers: {
      'X-API-Key': 'YOUR_KEY'
    }
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Metrics update:', data);
};
```

---

## Error Handling Best Practices

### 1. Always Check Status Code

```typescript
const response = await fetch('/api/v2/console/metrics/usage', {
  headers: { 'X-API-Key': apiKey }
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Error ${error.statusCode}: ${error.message}`);

  if (error.statusCode === 429) {
    // Wait and retry
    await sleep(error.retryAfter * 1000);
    return retryRequest();
  }

  throw new Error(error.message);
}

const data = await response.json();
```

### 2. Handle Rate Limits

```typescript
async function makeRequest(url: string, apiKey: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      headers: { 'X-API-Key': apiKey }
    });

    if (response.status === 429) {
      const error = await response.json();
      const waitTime = error.retryAfter || 60;
      console.log(`Rate limited. Waiting ${waitTime}s...`);
      await sleep(waitTime * 1000);
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

### 3. Log Request IDs for Debugging

```typescript
const response = await fetch('/api/v2/console/metrics/usage', {
  headers: { 'X-API-Key': apiKey }
});

if (!response.ok) {
  const error = await response.json();
  console.error(`Request failed [${error.requestId}]: ${error.message}`);
  // Include requestId in support tickets
}
```

---

## Testing

### Test API Key

For development/testing, use any 32+ character string:

```bash
export TEST_API_KEY="12345678901234567890123456789012"
```

### Test Rate Limiting

```bash
# Send 101 requests rapidly
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-API-Key: $TEST_API_KEY" \
    http://localhost:3000/api/v2/console/metrics/quota
done
```

Expected: First 100 return `200`, 101st returns `429`.

### Test Error Responses

```bash
# Missing API key (401)
curl http://localhost:3000/api/v2/console/metrics/usage

# Invalid API key (401)
curl -H "X-API-Key: short" \
  http://localhost:3000/api/v2/console/metrics/usage

# Not found (404)
curl -H "X-API-Key: $TEST_API_KEY" \
  http://localhost:3000/api/v2/invalid-endpoint
```

---

## Configuration

### Environment Variables

```env
# Rate Limiting
THROTTLE_TTL=60000              # 1 minute
THROTTLE_LIMIT=100              # 100 requests

# Redis (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys (future)
API_KEY_MIN_LENGTH=32
API_KEY_VALIDATE_DB=false       # Enable database validation
```

---

## Troubleshooting

### Issue: "API key is missing"

**Cause**: No `X-API-Key` or `Authorization` header provided.

**Solution**:
```bash
# Add header
curl -H "X-API-Key: YOUR_KEY" <url>
```

### Issue: "Invalid API key format"

**Cause**: API key is shorter than 32 characters.

**Solution**: Use a key with at least 32 characters.

### Issue: "Too Many Requests"

**Cause**: Exceeded 100 requests per minute.

**Solution**:
1. Wait for `retryAfter` seconds
2. Implement exponential backoff
3. Request higher rate limit (future feature)

### Issue: "Cannot GET /api/v2/..."

**Cause**: Invalid endpoint path.

**Solution**: Check endpoint URL and method (GET/POST/etc).

---

## Support

For issues or questions:
1. Check this reference guide
2. Review error response and `requestId`
3. Check application logs with `requestId`
4. Contact support with `requestId` for debugging

---

**Last Updated**: 2026-02-05
**Version**: Console API v1.0
**Documentation**: See [CONSOLE_API_SECURITY_IMPLEMENTATION.md](./CONSOLE_API_SECURITY_IMPLEMENTATION.md)
