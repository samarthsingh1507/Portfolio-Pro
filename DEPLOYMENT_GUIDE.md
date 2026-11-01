# PortfolioPro — 100% Free Forever Deployment Guide
*(No Credit Card Required • No Expiring Trials • Free Tiers)*

This guide walks you through deploying **PortfolioPro** completely online using **100% free forever** hosting platforms:
- **Frontend**: [Vercel](https://vercel.com) (Global CDN, free SSL, auto-deploys on Git push)
- **Backend**: [Render](https://render.com) (750 free instance hours/month for Spring Boot Docker container)
- **Database**: [TiDB Cloud Serverless](https://tidbcloud.com) (5 GB free forever, 100% MySQL wire-compatible, no credit card required)

---

## Architecture Diagram

```mermaid
graph LR
    User([Browser / User]) -->|HTTPS| Vercel["Vercel Edge Network\n(Angular 19 Standalone SPA)"]
    Vercel -->|REST API / Bearer JWT| Render["Render Web Service (Free Tier)\n(Spring Boot 3.3.4 in Docker)"]
    Render -->|Secure JDBC / MySQL Protocol| TiDB[("TiDB Cloud Serverless (Free)\n(5GB MySQL 8.0 Compatible DB)")]
    Render -->|REST API (Cached)| TwelveData["Twelve Data API\n(Live Market Quotes)"]
```

---

## Step 0: Push Code Updates to GitHub

Make sure your repository has the latest configurations (CORS patterns, dynamic `$PORT` binding, container memory optimization, and Vercel routing):

```bash
git add .
git commit -m "chore: optimize for Render and TiDB free-tier deployment"
git push origin main
```

---

## Step 1: Create a Free MySQL Database on TiDB Cloud

[TiDB Cloud Serverless](https://tidbcloud.com) is 100% compatible with MySQL 8.0, provides 5 GB of free storage forever, and does not require a credit card.

1. Go to [tidbcloud.com](https://tidbcloud.com) and click **"Start Free"** (Sign in with GitHub).
2. Click **"Create Cluster"**.
3. Select **"Serverless"** (Free tier).
4. Choose your preferred cloud region (e.g., AWS us-east-1 or any region close to you).
5. Click **"Create"** (it provisions in ~15 seconds).
6. Under the **"Security"** tab:
   - Click **"Allow Traffic from Anywhere"** (CIDR `0.0.0.0/0`) so Render can connect to your database.
7. Click the **"Connect"** button on the top right:
   - Choose **"General"** or **"Java / Spring Boot"**.
   - Click **"Generate Password"** and copy your credentials:
     - **Host**: e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`
     - **Port**: `4000`
     - **User**: e.g., `xxxxxxxx.root`
     - **Password**: `your_generated_password`
     - **Database**: `portfoliopro` (or `test`)

---

## Step 2: Deploy Spring Boot Backend on Render

[Render](https://render.com) provides 750 free hours per month for web services, which is enough to run your backend 24/7 for free.

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **"New +"** on the top right $\rightarrow$ Select **"Web Service"**.
3. Connect your GitHub repository: `samarthsingh1507/Portfolio-Pro`.
4. Configure the service details:
   - **Name**: `portfoliopro-backend` (or your choice)
   - **Region**: Choose the region closest to your TiDB cluster (e.g., Oregon or Ohio)
   - **Root Directory**: `backend`
   - **Runtime**: **Docker** *(Render will automatically use `backend/Dockerfile`)*
   - **Instance Type**: **Free** ($0/month — 512 MB RAM, 0.1 CPU)
5. Scroll down to **"Environment Variables"** and add:

| Key | Value | Notes |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://<YOUR-TIDB-HOST>:4000/portfoliopro?useSSL=true&verifyServerCertificate=false` | Replace with your TiDB host |
| `SPRING_DATASOURCE_USERNAME` | `<YOUR-TIDB-USER>` | From TiDB Connect dialog |
| `SPRING_DATASOURCE_PASSWORD` | `<YOUR-TIDB-PASSWORD>` | From TiDB Connect dialog |
| `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | 256-bit HMAC signing key |
| `CORS_ALLOWED_ORIGINS` | `https://*.vercel.app,http://localhost:4200` | Allows all Vercel URLs & local dev |
| `MARKET_DATA_API_KEY` | `your_twelve_data_key_here` | *(Optional)* For live real-time stock prices |

6. Click **"Create Web Service"**.
7. Render will build the Docker container and start your Spring Boot application.
8. Once deployed (status shows green **"Live"**), copy the public URL at the top:
   - Example: `https://portfoliopro-backend.onrender.com`
9. Test it by visiting:
   `https://portfoliopro-backend.onrender.com/api/stocks`
   - It will return your seeded stocks JSON!

> [!NOTE]
> **Free Tier Cold Starts**: Render's free tier spins down after 15 minutes of inactivity to save resources. When someone visits your site, the first request may take ~30–45 seconds to wake up the server. Subsequent requests are fast and responsive!

---

## Step 3: Deploy Angular Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Import your repository: `samarthsingh1507/Portfolio-Pro`.
4. Configure the project:
   - **Framework Preset**: Angular
   - **Root Directory**: Click "Edit" and choose `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/portfolio-pro-frontend/browser`
5. In **"Environment Variables"**, add:

| Name | Value | Description |
|---|---|---|
| `API_URL` | `https://portfoliopro-backend.onrender.com/api` | Your live Render backend URL from Step 2 |

6. Click **"Deploy"**.
7. Vercel will install dependencies, automatically run `set-env.js` to inject your Render API URL into `environment.ts`, compile the Angular SPA, and assign a live URL (e.g., `https://portfolio-pro-xxx.vercel.app`).

---

## Step 4: Verification & Live Testing

Once both services are deployed:

- [ ] **Open Frontend**: Visit your live Vercel URL.
- [ ] **Register User**: Click **Register** $\rightarrow$ create a new username and password.
- [ ] **Login**: Log in; verify the dashboard loads with market indicators.
- [ ] **Stock Detail & Chart**: Click on a stock (e.g. `NVDA` or `AAPL`); verify technical indicators (MA20, MA50, RSI-14) and interactive SVG charts render.
- [ ] **Execute Trade**: Buy 5 shares of `AAPL` $\rightarrow$ verify your cash and holdings update.
- [ ] **SPA Route Refresh**: Hit browser refresh on `/portfolio` or `/trade` $\rightarrow$ confirm the page reloads cleanly without 404 (handled by `vercel.json`).
