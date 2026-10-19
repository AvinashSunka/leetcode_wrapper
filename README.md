# LeetCode Wrapper

This project is a lightweight Node.js service that acts as the data-access layer for LeetCode. It calls LeetCode's public GraphQL endpoints and exposes clean REST endpoints that other services can consume without needing to know the upstream GraphQL schema.

This wrapper exists because the rest of the system should not depend directly on LeetCode GraphQL details. Instead:

- the backend can fetch daily challenge data via a single endpoint
- the Discord bot can request daily challenge info via a stable API
- other services can ask for topic/pattern problem lists without understanding the GraphQL query structure

---

## Why this service exists

LeetCode exposes a GraphQL API that is not especially developer-friendly for application integration. This wrapper normalizes that API into a simple HTTP contract.

It provides two main categories of data:

1. daily challenge details
2. problem lists for a specific pattern/topic

This separation makes the rest of the codebase easier to read and less fragile if LeetCode changes its internal GraphQL schema.

---

## Project structure

```text
leetcode_wrapper/
├── public/
├── src/
│   ├── config.js
│   ├── routes/
│   │   └── index.js
│   ├── services/
│   │   ├── dailyChallengeService.js
│   │   ├── leetcodeClient.js
│   │   └── patternService.js
│   └── utils/
│       └── normalizePattern.js
├── server.js
├── package.json
├── README.md
└── node_modules/
```

---

## Main responsibilities

### 1. Daily challenge fetch

`dailyChallengeService.js` requests the current daily challenge from LeetCode GraphQL and returns a normalized object containing:

- date
- title
- titleSlug
- difficulty
- link
- topic tags
- question metadata

This payload is consumed by the backend and Discord bot.

### 2. Pattern-based problem lookup

`patternService.js` validates a pattern name and retrieves problem data by tag. It also normalizes values such as:

- `array`
- `Array`
- `array-strings`
- `array_strings`

into a standard slug-like form so requests are consistent.

### 3. Shared GraphQL client

`leetcodeClient.js` centralizes the POST request used by every GraphQL query. This prevents duplicate request-building code across the service files and keeps the headers consistent.

### 4. Route handling

`src/routes/index.js` exposes the public endpoints. This file is intentionally thin and delegates the actual logic to services.

---

## API contract

### Health endpoints

```http
GET /health
GET /api/health
```

Both return a simple status object:

```json
{
  "status": "ok",
  "service": "leetcode-wrapper",
  "timestamp": "2026-10-19T12:00:00.000Z"
}
```

### Daily challenge endpoint

```http
GET /api/daily
```

Returns the current daily challenge or a 404 if LeetCode is temporarily unavailable.

Example response:

```json
{
  "success": true,
  "date": "2026-10-19",
  "data": {
    "title": "Two Sum",
    "titleSlug": "two-sum",
    "difficulty": "Easy",
    "link": "https://leetcode.com/problems/two-sum/"
  }
}
```

### Pattern endpoint

```http
GET /api/problems/:pattern
GET /api/problems?pattern=arrays
POST /api/problems
```

The service validates the pattern, checks whether it is a real LeetCode tag, and then returns a list of matching problems.

---

## Configuration

The most important settings live in `src/config.js`.

```js
const PORT = Number(process.env.PORT) || 3000;
const LEETCODE_GRAPHQL_URL = process.env.LEETCODE_GRAPHQL_URL || 'https://leetcode.com/graphql';
```

This allows deployment environments to set their own values without changing the code.

### Common environment variables

```bash
PORT=3000
LEETCODE_GRAPHQL_URL=https://leetcode.com/graphql
```

---

## How the GraphQL layer works

The wrapper does not expose raw GraphQL to consumers. Instead, it sends GraphQL requests internally and transforms the data into a stable REST response.

### Example flow

1. Request comes to `/api/daily`
2. `fetchDailyChallenge()` builds the GraphQL payload
3. `postGraphQL()` sends the request to LeetCode
4. the response is normalized and returned to the client

This pattern means the rest of the system is insulated from upstream schema changes.

---

## Local development

From this folder:

```bash
npm install
node server.js
```

The service listens on the configured port (default `3000`).

You can test the endpoints directly with curl:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/daily
curl "http://localhost:3000/api/problems?pattern=array"
```

---

## Troubleshooting

### `/api/daily` returns 500

Check:

- the service is running
- LeetCode GraphQL is reachable
- the LeetCode schema is still returning the expected fields

### Pattern validation fails

This usually means:

- the tag is misspelled
- the requested slug is not supported by LeetCode
- the upstream schema changed and the tag-fetch logic needs adjustment

### The app starts but no data is returned

Look at the console logs for GraphQL errors or HTTP status failures. This service is intentionally thin; most issues are usually upstream fetch or input normalization problems.

---

## Best practices for this service

- keep GraphQL query logic in service files, not route handlers
- keep route files focused on HTTP concerns
- centralize environment variables in config files
- do not hardcode LeetCode URLs or internal values in business logic
- keep transformations and normalization in dedicated utilities

This service is meant to be a clear adapter layer between the rest of the app and the external LeetCode API.

