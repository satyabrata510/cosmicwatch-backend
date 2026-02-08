# Postman Collections — Cosmic Watch API

## Quick Start

1. **Import into Postman**
   - Open Postman → Import → drag all files from this directory
   - Import the environment file: `CosmicWatch.postman_environment.json`

2. **Select Environment**
   - Click the environment dropdown (top-right) → select **"Cosmic Watch - Development"**

3. **Run in Order**
   - Start with **Auth** collection → **Register** or **Login** — tokens are auto-saved
   - Then hit any authenticated endpoint — `{{accessToken}}` is automatically injected

## Collection Files

| File | Endpoints | Description |
|------|-----------|-------------|
| `Health.postman_collection.json` | 1 | Server health check |
| `Auth.postman_collection.json` | 7 | Register, Login, Refresh, Profile (+ negative tests) |
| `NEO.postman_collection.json` | 6 | Feed, Lookup, Risk, Sentry Risk, Batch Analysis |
| `CNEOS.postman_collection.json` | 4 | Close Approaches, Sentry List/Detail, Fireballs |
| `SpaceWeather.postman_collection.json` | 4 | CME, Solar Flares, Geomagnetic Storms, Notifications |
| `APOD.postman_collection.json` | 3 | Today, Random, Date Range |
| `EPIC.postman_collection.json` | 3 | Natural, Enhanced, Available Dates |
| `NASAMedia.postman_collection.json` | 2 | Search, Asset Details |
| `Watchlist.postman_collection.json` | 5 | Add, Get, Delete (+ negative tests) |
| `Alerts.postman_collection.json` | 5 | Get, Unread, Count, Mark Read, Mark All |

## Environment Variables

| Variable | Description | Auto-Set? |
|----------|-------------|-----------|
| `baseUrl` | API base URL | Pre-configured |
| `accessToken` | JWT access token | ✅ On Login/Register |
| `refreshToken` | JWT refresh token | ✅ On Login/Register |
| `userId` | Current user's ID | ✅ On Login/Register |
| `userEmail` | Current user's email | ✅ On Login/Register |
| `asteroidId` | NEO reference ID for lookups | ✅ On Feed request |
| `alertId` | Alert UUID | ✅ On Get Alerts |
| `sentryDesignation` | Sentry object designation | ✅ On Sentry List |
| `nasaMediaId` | NASA media ID for asset lookup | ✅ On Media Search |
| `startDate` | Date range start | Manual |
| `endDate` | Date range end | Manual |
| `chatRoomId` | Chat room identifier | Manual |

## Test Coverage

Every endpoint includes Postman test scripts that validate:
- HTTP status codes (200, 201, 401, 404, 409)
- Response structure and required fields
- Auto-population of environment variables
- Negative test cases (invalid credentials, duplicates, not found)

## Running All Tests

Use the **Collection Runner** to execute the entire suite in sequence:
1. Click "..." on the collection → **Run collection**
2. Ensure environment is selected
3. Click **Run Cosmic Watch API**

Tests are designed to run sequentially — `Register` → `Login` populates tokens, `Feed` populates `asteroidId`, etc.
