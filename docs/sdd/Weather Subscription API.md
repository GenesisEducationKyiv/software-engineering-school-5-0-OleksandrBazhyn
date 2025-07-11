# System Design: Weather Subscription API

## 1. System Requirements

### Functional Requirements
- Users can subscribe to weather notifications for a specific city with a specified frequency
- The system sends regular messages (hourly, daily)
- API for managing subscriptions (creation, confirmation, deletion)
- Support for different message types (email, websocket)
- Ability to get current weather information via API

### Non-Functional Requirements
- **Availability:** 99.9% uptime
- **Scalability:** up to 2K users, 40K messages/day
- **Latency:** < 200 ms for API requests
- **Reliability:** guaranteed message delivery
- **Security:** data authentication and validation

### Limitations
- **Budget:** minimum infrastructure
- **External API rate limits:** 1K requests/hour
- **Compliance:** GDPR for user data

## 2. Load Estimation

### Users and Traffic
- **Active Users:** 1K
- **Subscriptions per user:** 2-3 (average)
- **API Requests:** 1K RPS (peak)
- **Messages:** 500K/day

### Data
- **Subscription:** ~200 bytes
- **Weather Cache:** ~2KB per city
- **Total Volume:** ~100GB/year

### Bandwidth
- **Incoming:** 1 Mbps
- **Outgoing:** 5 Mbps
- **External API:** 50 Mbps

## 3. High-Level Architecture

![High-Level Architecture](high-level%20architecture.png)

## 4. Detailed Component Design

### API Service (Node.js/Express + TypeScript)

**Responsibilities:**
- REST API request processing
- User authentication
- Data validation
- CRUD operations with subscriptions

**Endpoints:**<br/>
GET /api/v1/weather/:city<br/>
POST /api/v1/subscribe<br/>
GET /api/v1/confirm/:token<br/>
GET /api/v1/unsubscribe/:token

**Scaling:** Horizontal scaling using container orchestration