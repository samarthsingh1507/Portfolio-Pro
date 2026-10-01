# PortfolioPro — Environment & Configuration Guide

This guide details all configuration variables, secret management practices, and environment setup instructions for PortfolioPro.

---

## 1. Security Principles

1. **Zero Secret Leakage**:
   - API keys and tokens must **never** be committed to source code or version control repositories.
   - All `.env` and local credential files are excluded via `.gitignore`.
2. **Server-Side Proxy Architecture**:
   - The Angular frontend **never** communicates directly with external market data providers (e.g., Twelve Data).
   - The frontend consumes internal endpoints (`/api/market/*`), completely insulating external credentials from browser inspection or client bundles.
3. **Structured Log Sanitization**:
   - The backend logger automatically filters and redacts query string parameters (e.g., `apikey=***`, `token=***`) before writing log entries to console or aggregators.

---

## 2. Configuration Variables Reference

| Variable Name | Default Value | Required? | Description |
|---|---|---|---|
| `MARKET_DATA_API_KEY` | `""` (empty) | **Yes** (for live market data) | Your Twelve Data API key (free or paid plan). |
| `MARKET_DATA_BASE_URL` | `https://api.twelvedata.com` | No | Base endpoint URL for the market data provider. |
| `MARKET_DATA_CONNECT_TIMEOUT_MS` | `3000` | No | HTTP connection timeout in milliseconds. |
| `MARKET_DATA_READ_TIMEOUT_MS` | `5000` | No | HTTP socket read timeout in milliseconds. |
| `MARKET_DATA_CACHE_TTL_SECONDS` | `15` | No | Server-side in-memory cache TTL in seconds to protect rate limits. |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/portfoliopro?...` | No | JDBC connection string for MySQL database. |
| `SPRING_DATASOURCE_USERNAME` | `root` | No | Database user username. |
| `SPRING_DATASOURCE_PASSWORD` | `""` (empty) | No | Database user password. |
| `JWT_SECRET` | *(Standard dev fallback)* | No (Dev) / **Yes** (Prod) | 256-bit HMAC-SHA signing secret for JWT access tokens. |
| `SERVER_PORT` / `server.port` | `8080` | No | Port on which the Spring Boot REST API listens. |

---

## 3. Quick Start Setup (Twelve Data Integration)

### Step 1: Create Your `.env` File
Copy the example file to `.env`:
```bash
cp .env.example .env
```

### Step 2: Configure Your Twelve Data API Key
Edit `.env` and set your Twelve Data API key:
```ini
MARKET_DATA_API_KEY=your_actual_twelve_data_api_key
MARKET_DATA_BASE_URL=https://api.twelvedata.com
```

> [!NOTE]
> If you do not have a Twelve Data key yet, you can register for a free key at [twelvedata.com](https://twelvedata.com). The free tier provides 8 requests per minute and 800 requests per day. The built-in 15-second server-side cache ensures efficient usage under this limit.

### Step 3: Run the Backend Locally

#### Option A: Export Environment Variables in Terminal
```bash
cd backend
export MARKET_DATA_API_KEY="your_actual_twelve_data_api_key"
export MARKET_DATA_BASE_URL="https://api.twelvedata.com"
mvn spring-boot:run
```

#### Option B: Pass via Maven System Properties
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.arguments="--market.data.api-key=your_actual_twelve_data_api_key"
```

---

## 4. Market Data Endpoints

| Endpoint | Method | Description | Cache Behavior |
|---|---|---|---|
| `/api/market/quote/{symbol}` | `GET` | Real-time quote for single symbol (e.g. `AAPL`) | Cached for 15 seconds |
| `/api/market/quotes?symbols=AAPL,MSFT` | `GET` | Batch quotes for comma-separated symbols | Missing symbols fetched & cached |
| `/api/market/search?query={query}` | `GET` | Searches tickers and instrument names | Live lookup via Twelve Data |

### Standard Response Format:
```json
{
  "symbol": "AAPL",
  "price": 227.45,
  "change": 1.95,
  "changePercent": 0.86,
  "timestamp": "2026-09-29T10:00:00Z",
  "marketStatus": "OPEN"
}
```
