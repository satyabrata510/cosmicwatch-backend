# Complete API Reference

> All 33 REST endpoints + 12 WebSocket events at a glance

## API Map

```mermaid
flowchart TB
    GW["Express 5 Gateway — :4000"]

    GW --> HEALTH["Health ×1"]

    GW --> AUTH_G["Auth ×4"]
    AUTH_G --> REG["POST register"]
    AUTH_G --> LOG["POST login"]
    AUTH_G --> REF["POST refresh"]
    AUTH_G --> PROF["GET profile 🔒"]

    GW --> NEO_G["NEO ×5"]
    NEO_G --> FEED["GET feed"]
    NEO_G --> LOOK["GET lookup/:id"]
    NEO_G --> RISK["GET risk"]
    NEO_G --> SRISK["GET :id/risk"]
    NEO_G --> SENR["GET :id/sentry-risk"]

    GW --> CNEOS_G["CNEOS ×4"]
    GW --> SW_G["Space Weather ×4"]
    GW --> APOD_G["APOD ×3"]
    GW --> EPIC_G["EPIC ×3"]
    GW --> MEDIA_G["Media ×2"]

    GW --> WL_G["Watchlist ×3 🔒"]
    GW --> AL_G["Alerts ×4 🔒"]
    GW --> WS_G["WebSocket ×12 🔒"]
```

> 🔒 = JWT authentication required

---

## Base URL

```
http://localhost:4000/api/v1
```

---

## Endpoint Count by Module

| Module | Endpoints | Details |
|--------|-----------|---------|
| Health | 1 | [→ Health](#1-health) |
| Auth | 4 | [→ AUTH.md](./AUTH.md) |
| NEO | 5 | [→ NEO.md](./NEO.md) |
| CNEOS (SSD) | 4 | [→ CNEOS](#4-cneos-ssdcneos--4-endpoints) |
| Space Weather (DONKI) | 4 | [→ Space Weather](#5-space-weather-donki--4-endpoints) |
| APOD | 3 | [→ APOD](#6-apod-astronomy-picture-of-the-day--3-endpoints) |
| EPIC | 3 | [→ EPIC](#7-epic-earth-polychromatic-imaging-camera--3-endpoints) |
| NASA Media | 2 | [→ Media](#8-nasa-image--video-library--2-endpoints) |
| Watchlist | 3 | [→ WATCHLIST.md](./WATCHLIST.md) |
| Alerts | 4 | [→ ALERTS.md](./ALERTS.md) |
| WebSocket | 12 events | [→ WEBSOCKET.md](./WEBSOCKET.md) |
| **Total** | **33 REST + 12 WS** | |

---

## 1. Health

### `GET /api/v1/health`

| Property | Value |
|----------|-------|
| Auth | None |
| Rate Limit | Global |
| Description | Server health check |

**Response:**
```json
{
  "success": true,
  "message": "🚀 Cosmic Watch API is operational",
  "timestamp": "2026-02-07T10:00:00.000Z",
  "uptime": 3600.123
}
```

---

## 2. Auth — 4 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | No | Register a new user (USER or RESEARCHER) |
| `POST` | `/auth/login` | No | Login with email & password |
| `POST` | `/auth/refresh` | No | Refresh expired access token |
| `GET` | `/auth/profile` | Bearer | Get authenticated user's profile |

[Full documentation →](./AUTH.md)

---

## 3. NEO (Near-Earth Objects) — 5 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/neo/feed` | No | Fetch NEO data for a date range |
| `GET` | `/neo/lookup/:asteroidId` | No | Detailed lookup of a specific asteroid |
| `GET` | `/neo/lookup/:asteroidId/risk` | No | Single asteroid risk analysis |
| `GET` | `/neo/lookup/:asteroidId/sentry-risk` | No | Sentry-enhanced risk analysis |
| `GET` | `/neo/risk` | No | Batch risk analysis with scoring engine |
[Full documentation →](./NEO.md)

---

## 4. CNEOS (SSD/CNEOS) — 4 Endpoints

> CNEOS/SSD APIs do **not** require a NASA API key.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/cneos/close-approaches` | No | Close approach data (next 60 days default) |
| `GET` | `/cneos/sentry` | No | Sentry impact monitoring list |
| `GET` | `/cneos/sentry/:designation` | No | Sentry object detail + virtual impactors |
| `GET` | `/cneos/fireballs` | No | Fireball / bolide event data |

### `GET /cneos/close-approaches`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_min` | query | `now` | Start date (YYYY-MM-DD or `now`) |
| `date_max` | query | `+60` | End date (YYYY-MM-DD or `+N` days) |
| `dist_max` | query | `10LD` | Max distance (e.g. `10LD`, `0.05AU`) |
| `sort` | query | `dist` | Sort field |
| `limit` | query | — | Max results |

### `GET /cneos/sentry`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ps_min` | query | — | Min Palermo scale |
| `ip_min` | query | — | Min impact probability |
| `h_max` | query | — | Max absolute magnitude |

### `GET /cneos/sentry/:designation`

| Parameter | Type | Description |
|-----------|------|-------------|
| `designation` | path | Asteroid designation (e.g. `29075`) |

### `GET /cneos/fireballs`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_min` | query | — | Start date |
| `date_max` | query | — | End date |
| `limit` | query | `20` | Max results |
| `sort` | query | `-date` | Sort field |
| `energy_min` | query | — | Min impact energy (kt) |

---

## 5. Space Weather (DONKI) — 4 Endpoints

> All DONKI endpoints use the NASA API key. Default date range is last 30 days.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/space-weather/cme` | No | Coronal Mass Ejections |
| `GET` | `/space-weather/flares` | No | Solar flare events |
| `GET` | `/space-weather/storms` | No | Geomagnetic storms (Kp index) |
| `GET` | `/space-weather/notifications` | No | Space weather notifications |

### Common Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | query | 30 days ago | Start date YYYY-MM-DD |
| `end_date` | query | today | End date YYYY-MM-DD |

### `GET /space-weather/notifications`

Additional parameter:

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | query | Filter by notification type |

---

## 6. APOD (Astronomy Picture of the Day) — 3 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/apod/today` | No | Today's APOD (or specific date) |
| `GET` | `/apod/random` | No | Random APOD(s) |
| `GET` | `/apod/range` | No | APOD for a date range |

### `GET /apod/today`

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | query | Specific date YYYY-MM-DD (default: today) |

### `GET /apod/random`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `count` | query | `5` | Number of random APODs (1–10) |

### `GET /apod/range`

| Parameter | Type | Description |
|-----------|------|-------------|
| `start_date` | query | Start date YYYY-MM-DD (required) |
| `end_date` | query | End date YYYY-MM-DD (required) |

---

## 7. EPIC (Earth Polychromatic Imaging Camera) — 3 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/epic/natural` | No | Latest natural color Earth images |
| `GET` | `/epic/enhanced` | No | Latest enhanced color Earth images |
| `GET` | `/epic/dates` | No | Available image dates |

### `GET /epic/natural` & `GET /epic/enhanced`

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | query | Specific date YYYY-MM-DD (default: latest) |

### `GET /epic/dates`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | query | `natural` | Image type: `natural` or `enhanced` |

---

## 8. NASA Image & Video Library — 2 Endpoints

> NASA Media APIs do **not** require an API key.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/media/search` | No | Search NASA image/video library |
| `GET` | `/media/asset/:nasaId` | No | Get asset files for a NASA ID |

### `GET /media/search`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | query | — | Search query (required) |
| `media_type` | query | — | `image`, `video`, or `audio` |
| `year_start` | query | — | Filter by start year |
| `year_end` | query | — | Filter by end year |
| `page` | query | `1` | Page number |

### `GET /media/asset/:nasaId`

| Parameter | Type | Description |
|-----------|------|-------------|
| `nasaId` | path | NASA media ID |

---

## 9. Watchlist — 3 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/watchlist` | Bearer | Add asteroid to watchlist |
| `GET` | `/watchlist` | Bearer | Get user's watchlist (paginated) |
| `DELETE` | `/watchlist/:asteroidId` | Bearer | Remove asteroid from watchlist |

[Full documentation →](./WATCHLIST.md)

---

## 10. Alerts — 4 Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/alerts` | Bearer | Get user's alerts (paginated, filterable) |
| `GET` | `/alerts/unread-count` | Bearer | Get unread alert count |
| `PATCH` | `/alerts/read-all` | Bearer | Bulk mark all as read |
| `PATCH` | `/alerts/:alertId/read` | Bearer | Mark single alert as read |

[Full documentation →](./ALERTS.md)

---

## 11. WebSocket (Chat) — 12 Events

### Client → Server (5)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `roomId` | Join a discussion room |
| `leave_room` | `roomId` | Leave a room |
| `send_message` | `{ roomId, content }` | Send a message |
| `typing_start` | `roomId` | Start typing indicator |
| `typing_stop` | `roomId` | Stop typing indicator |

### Server → Client (5)

| Event | Payload | Description |
|-------|---------|-------------|
| `room_history` | `{ roomId, messages[] }` | Last 50 messages on join |
| `new_message` | `ChatMessage` | Broadcast new message |
| `user_joined` | `{ userId, email, timestamp }` | User joined notification |
| `user_left` | `{ userId, email, timestamp }` | User left notification |
| `user_typing` / `user_stopped_typing` | `{ userId, email }` | Typing status |

[Full documentation →](./WEBSOCKET.md)

---

## Authentication

### Bearer Token

Protected endpoints require the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Acquisition Flow

```
1. POST /auth/register → { accessToken, refreshToken }
         or
   POST /auth/login    → { accessToken, refreshToken }

2. Use accessToken in Authorization header for protected routes

3. When accessToken expires:
   POST /auth/refresh { refreshToken } → { new accessToken, new refreshToken }
```

---

## Rate Limits

| Tier | Window | Max | Applies To |
|------|--------|-----|-----------|
| Global | 15 min | 100 | All endpoints |
| Auth | 15 min | 10 | `/auth/register`, `/auth/login` |
| NASA API | 1 min | 30 | `/neo/*`, `/cneos/*`, `/space-weather/*`, `/apod/*`, `/epic/*`, `/media/*` |

[Full documentation →](./RATE_LIMITING.md)

---

## Standard Response Envelope

### Success

```json
{
  "success": true,
  "message": "Description",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Error description",
  "error": "ErrorClassName"
}
```

[Error codes →](./ERROR_CODES.md)

---

## RBAC Roles

```mermaid
flowchart BT
    USER["USER<br/>Own watchlist & alerts<br/>Read NEO data"] --> RESEARCHER["RESEARCHER<br/>+ Extended NEO access"]
    RESEARCHER --> ADMIN["ADMIN<br/>+ Manage all users & resources"]
```

| Role | Permissions |
|------|-------------|
| `USER` | Own watchlist, own alerts, read NEO data |
| `RESEARCHER` | All USER permissions + extended NEO access |
| `ADMIN` | Full access — manage all users, resources |
