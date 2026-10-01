# PORTFOLIOPRO End-to-End Demo Walkthrough

This guide details the step-by-step evaluation workflow for PORTFOLIOPRO. Follow this exact sequence to demonstrate all platform capabilities from authentication through simulated trading, technical analysis, portfolio tracking, and risk analytics.

---

## Demo Credentials

- **Username**: `demo`
- **Password**: `demo123`
- **Frontend URL**: `http://localhost:4200`
- **Backend API**: `http://localhost:8080/api`

---

## Verified End-to-End Demo Sequence

```
Login
  → Dashboard
  → Market
  → Search AAPL
  → Stock Details
  → Technical Analysis
  → Fundamental Analysis
  → Watchlist
  → Buy AAPL
  → Order History
  → Portfolio
  → P/L
  → Risk & Performance
```

---

## Step-by-Step Walkthrough

### 1. Login
- **URL**: Navigate to `http://localhost:4200/login`
- **Action**: Enter `demo` in the Username field and `demo123` in the Password field. Click **Sign In**.
- **Under the Hood**:
  - `POST /api/auth/login` is dispatched.
  - JWT token is returned and stored securely in browser `localStorage`.
- **Expected Outcome**: Instant redirect to `/dashboard` with an active session indicator.

### 2. Dashboard
- **URL**: `http://localhost:4200/dashboard`
- **Action**: Review the unified command center.
- **UI Elements to Observe**:
  - **Welcome Header**: Personalized banner: *"Welcome, demo"*.
  - **Summary Cards**: Mark-to-market metrics (Portfolio Value, Total Invested, Total P/L, P/L %).
  - **Quick Action Bar**: Fast navigation buttons to Market, Portfolio, and Quick Trade.
  - **Market Snapshot**: Leading stocks with price tickers.
  - **User Watchlist**: Currently tracked assets.
  - **Recent Orders**: Stream of recent transaction records.

### 3. Market
- **URL**: Click **Market** in the top navigation bar (or navigate to `/market`).
- **Action**: Observe the full stock catalog table.
- **UI Elements to Observe**:
  - All 8 deterministic seeded stocks are presented: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `TSLA`, `NVDA`, `JPM`, `META`.
  - Columns displaying Symbol, Company Name, Current Price, Sector, and Action Buttons.

### 4. Search AAPL
- **Action**: In the search bar above the stock table, type `"AAPL"`.
- **Expected Outcome**:
  - Real-time client-side filter immediately isolates the `AAPL` row (Apple Inc. - Technology - $225.50).

### 5. Stock Details
- **Action**: Click on the `AAPL` stock row or click the **Details** button.
- **URL**: Navigates to `/market/AAPL`.
- **UI Elements to Observe**:
  - Stock Header: Company name, symbol badge, sector badge, and current trading price ($225.50).
  - Quick action buttons: **Add to Watchlist** and **Trade Stock**.

### 6. Technical Analysis
- **Action**: Scroll to the Technical Analysis section on the Stock Details page.
- **UI Elements to Observe**:
  - **Interactive Price Chart**: Smooth SVG historical price line spanning 60 trading days with hover crosshair and date/price tooltip.
  - **Technical Indicator Badges**:
    - **MA20 (20-day Simple Moving Average)**: Computed arithmetic mean of the last 20 closing prices.
    - **MA50 (50-day Simple Moving Average)**: Computed arithmetic mean of the last 50 closing prices.
    - **RSI-14 (Relative Strength Index)**: 14-period momentum oscillator with visual overbought (>70) / neutral / oversold (<30) classification badge.
- **Under the Hood**:
  - Fetched via `GET /api/analysis/technical/AAPL`.

### 7. Fundamental Analysis
- **Action**: Scroll to the Fundamental Analysis grid on the Stock Details page.
- **UI Elements to Observe**:
  - **Market Capitalization**: e.g., $3,450,000,000,000 ($3.45T).
  - **Earnings Per Share (EPS)**: $6.42.
  - **Price-to-Earnings Ratio (P/E)**: 35.12.
  - **Sector**: Technology.
- **Under the Hood**:
  - Fetched via `GET /api/analysis/fundamental/AAPL`.

### 8. Watchlist
- **Action**: On the Stock Details page, click the **★ Add to Watchlist** button.
- **Expected Outcome**:
  - Button toggles to **★ On Watchlist** (highlighted state).
  - A notification toast confirms: *"AAPL added to your watchlist"*.
  - When returning to the Dashboard, AAPL is visible in the Watchlist panel.
- **Under the Hood**:
  - Dispatches `POST /api/watchlist/1`.

### 9. Buy AAPL
- **Action**: Click the **Trade Stock** (or **Buy**) button on the AAPL details page to launch the Trade Modal.
- **Trade Parameters**:
  - Order Type: `BUY`
  - Quantity: Enter `5` (or use the `+` stepper button)
  - Price: Automatically populated with current market price `$225.50`
  - Total Order Value: `$1,127.50` (dynamically calculated)
- **Execution**: Click **Confirm BUY Order**.
- **Expected Outcome**:
  - Modal displays an execution confirmation dialog with Order ID, timestamp, and executed price.
- **Under the Hood**:
  - Dispatches `POST /api/orders` with `{ stockId: 1, type: "BUY", quantity: 5, price: 225.50 }`.
  - Backend creates holding record or recalculates weighted average purchase price.

### 10. Order History
- **Action**: Click **Orders** in the navigation bar (or navigate to `/orders`).
- **UI Elements to Observe**:
  - Audit trail table showing the newly placed BUY order.
  - Columns: Order ID, Type (`BUY` in bold green badge), Symbol (`AAPL`), Quantity (`5`), Execution Price (`$225.50`), Total Value (`$1,127.50`), Status (`EXECUTED`), and Execution Timestamp.
- **Under the Hood**:
  - Fetched via `GET /api/orders`.

### 11. Portfolio
- **Action**: Click **Portfolio** in the navigation bar (or navigate to `/portfolio`).
- **UI Elements to Observe**:
  - Holdings table displaying the newly acquired position:
    - **Stock**: AAPL (Apple Inc.)
    - **Quantity**: 5 shares
    - **Average Buy Price**: $225.50
    - **Current Market Price**: $225.50
    - **Total Invested**: $1,127.50
    - **Current Value**: $1,127.50
    - **Trade Button**: Inline button to open Trade Modal for quick BUY or SELL adjustments.
- **Under the Hood**:
  - Fetched via `GET /api/portfolio`.

### 12. Profit / Loss (P/L)
- **Action**: Review the Portfolio Summary cards at the top of the `/portfolio` page.
- **Metrics to Verify**:
  - **Total Invested**: `$1,127.50`
  - **Current Value**: `$1,127.50`
  - **Total P/L**: `$0.00`
  - **P/L %**: `0.00%`
  *(Note: Dynamic color coding displays positive green when Current Value > Invested Value and negative crimson when Current Value < Invested Value).*

### 13. Risk & Performance
- **Action**: Click **Analysis** in the navigation bar (or navigate to `/analysis`).
- **UI Elements to Observe**:
  - **Portfolio Performance Cards**: Total Invested, Current Value, and Aggregate Returns.
  - **Asset Allocation Visualizations**:
    - **Interactive SVG Donut Chart**: Proportional visual representation of holdings (e.g. 100% AAPL for a single holding).
    - **Allocation Progress Bar**: Multi-colored segmented bar with percentage breakdown per symbol.
  - **Diversification Rating**:
    - 1 holding: Displays **"Low Diversification"** badge with educational advice card.
    - (2-3 holdings: "Moderate Diversification", 4+ holdings: "Higher Diversification").
  - **Risk Concentration Indicator**:
    - 1 holding: Displays **"High Concentration"** warning badge.
    - (2-3 holdings: "Moderate Concentration", 4+ holdings: "Lower Concentration").
- **Under the Hood**:
  - Fetched via `GET /api/portfolio/analytics`.

---

## Explicit Platform Limitations

PORTFOLIOPRO is built specifically as a rapid prototype MVP for simulated trading and portfolio analytics. Please note the following explicit boundaries:

1. **Simulated Trading**: Orders are executed entirely within a simulated sandbox environment. No actual securities or instruments are purchased or sold.
2. **Seeded / Mock Market Data**: Stock listings, closing prices, and 60-day historical prices are deterministically seeded in MySQL. No live third-party financial exchange APIs (e.g., Bloomberg, IEX, AlphaVantage) are queried.
3. **No Real Brokerage**: The platform has no affiliations or connections with registered broker-dealers, clearinghouses, or electronic communication networks (ECNs).
4. **No Real Money**: There is no payment gateway integration, bank deposit mechanism, credit/debit card handling, or fiat currency flow.
5. **Basic Analytics**: Formulas represent standard introductory textbook calculations rather than institutional risk engines.
6. **Basic Technical Indicators**: Moving averages (MA20, MA50) and RSI-14 use basic historical close sequences without tick-level adjustments, volume weighting, or slippage models.
7. **Basic Risk Indicator**: Concentration and diversification indicators evaluate simple asset count thresholds without covariance matrices, beta regressions, or Value-at-Risk (VaR) modeling.

> [!WARNING]
> **Do NOT describe or treat this application as a real brokerage platform.** It is intended solely for educational, demonstrative, and portfolio simulation purposes.
