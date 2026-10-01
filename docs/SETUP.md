# PORTFOLIOPRO Setup & Installation Guide

This guide walks you through setting up and running PORTFOLIOPRO locally for development and evaluation.

---

## 1. System Prerequisites

Ensure the following tools are installed on your workstation:

| Tool | Recommended Version | Verification Command |
|---|---|---|
| **Java Development Kit (JDK)** | OpenJDK 17 or higher (tested through 27) | `java -version` |
| **Apache Maven** | 3.8.x or higher | `mvn -version` |
| **Node.js** | 18.x LTS or higher (tested on Node 26) | `node -v` |
| **npm** | 9.x or higher | `npm -v` |
| **MySQL Server** | 8.0.x or higher | `mysql --version` |
| **Docker & Docker Compose** | Docker 24+, Compose v2 | `docker compose version` |

---

## 2. Option A: Local Development Setup

### Step 2.1: Database Initialization
1. Ensure your local MySQL server is running on port `3306`.
2. Open a terminal and run the schema and seed scripts:
   ```bash
   cd portfolio-pro
   
   # Create database schema and tables
   mysql -u root -p < database/schema.sql
   
   # Populate seed data (8 stocks, 60 days price history, demo user)
   mysql -u root -p < database/seed.sql
   ```
3. *Default credentials in seed:*
   - Username: `demo`
   - Password: `demo123`
   - Email: `demo@portfoliopro.com`

### Step 2.2: Backend Configuration & Execution
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Verify database connection credentials in `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/portfoliopro?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=your_mysql_password
   spring.jpa.hibernate.ddl-auto=update
   ```
3. Run the automated test suite (29 unit & integration tests):
   ```bash
   mvn test
   ```
4. Start the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   *The backend will boot up on `http://localhost:8080`.*

### Step 2.3: Frontend Configuration & Execution
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Ensure `src/environments/environment.ts` targets the backend API:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8080/api'
   };
   ```
4. Start the Angular development server:
   ```bash
   npm start
   # or: npx ng serve --port 4200 --host 0.0.0.0
   ```
5. Open your web browser at `http://localhost:4200`.

---

## 3. Option B: Running with Docker Compose

If you have Docker and Docker Compose installed, you can spin up the complete multi-container stack (MySQL, Spring Boot backend, and Angular frontend) with a single command:

```bash
cd portfolio-pro
docker-compose up --build
```

### Container Endpoints:
- **Web UI (Frontend)**: `http://localhost:4200`
- **REST API (Backend)**: `http://localhost:8080/api`
- **Database (MySQL)**: `localhost:3306`

To shut down and remove containers:
```bash
docker-compose down -v
```

---

## 4. Verification & Health Checks

### Check Backend Health
Execute an unauthenticated probe to confirm the server is running:
```bash
curl -I http://localhost:8080/api/stocks
# Expected: HTTP/1.1 401 Unauthorized (confirms Spring Security is active)
```

### Check Authentication
Execute a login request for the demo user:
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'
# Expected: JSON response containing "token" and "username": "demo"
```

---

## 5. Troubleshooting & FAQ

### Port Already in Use
- **Port 8080**: If another process is using port 8080, terminate it using `lsof -i :8080` and `kill -9 <PID>`, or change `server.port=8081` in `application.properties` and update `environment.ts`.
- **Port 4200**: Specify a different port for Angular via `npx ng serve --port 4300`.

### MySQL Access Denied or Public Key Retrieval Error
If MySQL throws an authentication or public key retrieval exception, ensure your connection URL has:
```properties
allowPublicKeyRetrieval=true&useSSL=false
```
And verify that the database user has permissions:
```sql
GRANT ALL PRIVILEGES ON portfoliopro.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Angular EPERM / Analytics Permissions Error
If running inside a sandboxed CLI environment where `~/.angular-config.json` cannot be accessed, set:
```bash
NG_CLI_ANALYTICS=false npx ng serve --port 4200
```
