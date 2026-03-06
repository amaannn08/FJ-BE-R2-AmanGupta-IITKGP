# Finance Tracker Backend

This is the backend for the Finance Tracker application, built with Node.js, Express, and PostgreSQL. It provides a RESTful API for managing transactions, budgets, categories, reports, and recurring bills.

## 🚀 Tech Stack

-   **Runtime:** Node.js
-   **Framework:** Express.js
-   **Database:** PostgreSQL
-   **ORM/Query Builder:** `pg` (node-postgres) with raw SQL queries and migrations
-   **Authentication:** JWT (JSON Web Tokens), Google OAuth 2.0
-   **Email Service:** Nodemailer
-   **AI Integration:** Google Generative AI (Gemini) for analysis

## 📂 Project Structure

```
backend/
├── index.js                # Application entry point
├── src/
│   ├── config/             # Configuration files (DB, AI, etc.)
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middleware (Auth, etc.)
│   ├── models/             # Database models and schema definitions
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic services
│   └── db.js               # Database connection pool
├── migrations/             # SQL migration files
├── scripts/                # Utility scripts (migrations, etc.)
├── uploads/                # Directory for file uploads (e.g., receipts)
└── package.json            # Dependencies and scripts
```

## 🛠️ Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher recommended)
-   [PostgreSQL](https://www.postgresql.org/) (v14 or higher recommended)

## ⚙️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd finance-tracker/backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root of the `backend` directory. You can use the following template:

    ```env
    PORT=3000
    DATABASE_URL=postgres://user:password@localhost:5432/finance_tracker
    
    # JWT Configuration
    JWT_SECRET=your_jwt_secret_key
    
    # Google OAuth (for Sign in with Google)
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
    
    # Email Service (for OTPs and Notifications)
    EMAIL_HOST=smtp.example.com
    EMAIL_PORT=587
    EMAIL_USER=your_email@example.com
    EMAIL_PASS=your_email_password
    
    # AI Integration
    GEMINI_API_KEY=your_gemini_api_key
    
    # FX Rates (optional overrides, defaults provided in code)
    # FX_RATE_INR=1
    # FX_RATE_USD_INR=83.5
    # FX_RATE_EUR_INR=90.0
    ```

4.  **Database Setup:**
    Run the migration script to set up the database schema:
    ```bash
    npm run migrate:up
    ```

## 🏃‍♂️ Running the Server

-   **Development Mode** (with hot-reload using `nodemon`):
    ```bash
    npm run dev
    ```

-   **Production Mode:**
    ```bash
    npm start
    ```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## 📡 API Endpoints Overview

### Authentication
-   `POST /signup` - Register a new user
-   `POST /signin` - Login with email/password
-   `POST /auth/send-otp` - Send OTP for verification
-   `POST /auth/verify-otp` - Verify OTP
-   `GET /auth/google` - Initiate Google OAuth flow

### Transactions
-   `GET /transactions` - List transactions (supports filtering)
-   `POST /transactions` - Create a new transaction
-   `PUT /transactions/:id` - Update a transaction
-   `DELETE /transactions/:id` - Delete a transaction
-   `POST /transactions/:id/receipt` - Upload a receipt image

### Budgets & Categories
-   `GET /budgets` - Get budget details
-   `POST /budgets` - Set/Update budget
-   `GET /categories` - List transaction categories

### Reports & Dashboard
-   `GET /dashboard` - Get summary data for the dashboard
-   `GET /reports/monthly` - Get monthly financial reports
-   `GET /analysis` - AI-powered financial analysis

## 🔄 Database Migrations

The project uses a custom migration script located in `scripts/migrate.js`.

-   **Apply Migrations:** `npm run migrate:up`
-   **Rollback Migrations:** `npm run migrate:down`

Migrations are stored in the `migrations/` folder as SQL files (e.g., `001_init_base_schema.sql`).

## 🤝 Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a Pull Request.
