# Expense Tracker with Gemini AI & Cloud Database

A production-ready, full-stack personal finance web application built with vanilla JavaScript (ES Modules), HTML5, CSS3, and Node.js/Express. It features an interactive executive dashboard, user authentication, multi-database support (MongoDB & SQLite), intelligent receipt OCR scanning (powered by Google Gemini Vision AI with on-device Tesseract OCR fallback), and a personal finance assistant chatbot powered by Google Gemini.

The entire frontend and backend follow a strict **Model-View-Controller (MVC)** architectural pattern.

---

## Key Features

1. **Executive Dashboard & 1-Click Interactive Demo**:
   - High-level KPIs: Total Spend, Monthly Spend with MoM trend percentage, Total Scanned Receipts.
   - Dual Visualizations: 6-Month Spending Trend Bar Chart and Category Breakdown Doughnut Chart (via Chart.js CDN).
   - Instant "Try 1-Click Interactive Demo" button to seed and explore sample financial data immediately.

2. **User Authentication & Cloud Database**:
   - Register new user accounts and sign in securely.
   - Passwords hashed with `bcryptjs`.
   - JWT token-based authentication (`Bearer <token>`).
   - User-isolated transactions: each user only sees their own data.
   - **Dual Database Layer**:
     - Cloud **MongoDB Atlas** via Mongoose when `MONGODB_URI` is provided.
     - Zero-configuration embedded **SQLite** via Node.js native engine when running locally or without MongoDB.
     - Seamless guest mode with automatic cloud sync upon login.

3. **Intelligent Receipt OCR Scanning (Vision AI & Fallback)**:
   - Upload receipt image via drag-and-drop, file picker, or phone camera.
   - Powered by **Google Gemini Vision AI** (multi-model fallback: `gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-2.5-flash`).
   - Automatic on-device **Tesseract.js** OCR fallback when an API key is not yet configured.
   - Multi-category receipt parsing with automatic item and tax breakdown.
   - "Split into Separate Category Expenses" one-click action.

4. **Receipt History & Side-by-Side Audit Modal**:
   - Dedicated Receipts tab displaying all scanned receipts.
   - Filter by category with live count badges.
   - Side-by-side inspection modal showing the original receipt image next to extracted merchant, date, amount, and department breakdown.

5. **AI Personal Finance Chatbot**:
   - Ask natural language questions about your spending ("How much did I spend on food this month?", "What was my biggest expense?", "Give me tips to save money").
   - Precomputes compact monthly financial summaries so queries are lightning-fast and accurate.
   - Enforces strict grounded responses in Indian Rupees (₹).

---

## Architecture (Strict MVC)

```
expense-tracker/
├── .env.example                    # Sample environment variables
├── .gitignore                      # Git ignore rules (node_modules, .env, *.sqlite)
├── render.yaml                     # Render.com Infrastructure-as-Code deployment spec
├── DEPLOYMENT.md                   # Step-by-step GitHub upload & Render deployment guide
├── package.json                    # Project metadata & dependencies
├── README.md                       # Comprehensive documentation
├── server/
│   ├── server.js                   # Express server entry point, static files, middleware
│   ├── config/
│   │   └── db.js                   # Dual-engine database adapter (MongoDB + SQLite)
│   ├── middleware/
│   │   └── auth.middleware.js      # JWT authentication and user resolution middleware
│   ├── models/
│   │   ├── User.js                 # User schema and bcrypt password methods
│   │   └── Transaction.js          # Transaction schema, queries, and migrations
│   ├── routes/
│   │   ├── ai.routes.js            # Routes for OCR, chat, and API key management
│   │   ├── auth.routes.js          # Routes for register, login, and user profile
│   │   └── transaction.routes.js   # Routes for CRUD transaction operations
│   ├── controllers/
│   │   ├── ai.controller.js        # AI endpoint handlers (/api/receipt, /api/chat)
│   │   ├── auth.controller.js      # Authentication endpoint handlers
│   │   └── transaction.controller.js# Transaction endpoint handlers & cloud sync
│   └── services/
│       └── gemini.service.js       # Google Gemini Vision and Chat API integration
└── public/
    ├── index.html                  # Semantic, accessible HTML markup
    ├── css/
    │   └── style.css               # Modern responsive styling & animations
    └── js/
        ├── app.js                  # Application entry point wiring MVC components
        ├── models/
        │   ├── AuthModel.js        # Manages JWT tokens, user state, and auth requests
        │   ├── TransactionModel.js # Transactions state, DB sync, calculations & demo seed
        │   └── ChatModel.js        # Conversation history & /api/chat communication
        ├── views/
        │   ├── AuthView.js         # Login/Register modal & header user pill
        │   ├── DemoBannerView.js   # Dashboard hero banner with 1-click demo loader
        │   ├── TransactionView.js  # KPI cards, forms, and transaction lists
        │   ├── ChartView.js        # Chart.js spending trend & category doughnut
        │   ├── ReceiptView.js      # Receipt upload zone, preview, and API key modal
        │   ├── ReceiptHistoryView.js# Receipts gallery and side-by-side inspection modal
        │   └── ChatView.js         # Slide-over chat drawer & message bubbles
        ├── controllers/
        │   ├── AuthController.js   # Coordinates login, register, and transaction sync
        │   ├── TransactionController.js# Form validation, cashflow updates, and CRUD
        │   ├── ReceiptController.js# Receipt upload, OCR dispatch, and pre-filling
        │   ├── ReceiptHistoryController.js# Category filtering & audit modal
        │   └── ChatController.js   # Precomputes summaries and manages assistant chat
        └── utils/
            └── receiptParser.js    # Rule-based OCR line parsing & total detection
```

---

## Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- Optional: Google Gemini API Key ([Get free API key from Google AI Studio](https://aistudio.google.com/))

### 2. Installation
```bash
# Clone or navigate to the project directory
cd expense-tracker

# Install dependencies
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` to configure your settings:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_key_12345
# Optional: MONGODB_URI=mongodb+srv://... (If omitted, uses built-in SQLite)
```

> **Note**: If you don't have a Gemini API key yet, the app still works! It uses on-device Tesseract OCR and embedded SQLite automatically.

### 4. Start the Application
```bash
npm start
```
Open your browser at `http://localhost:3000`.

---

## Deploying to Render & GitHub

Complete, step-by-step instructions for publishing this project to **GitHub** and hosting it for free on **Render** can be found in:
👉 **[DEPLOYMENT.md](file:///Users/ankitrathore/.gemini/antigravity/scratch/expense-tracker/DEPLOYMENT.md)**

### Quick GitHub Commands:
```bash
git init
git add .
git commit -m "Initial commit: AI-powered Expense Tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Security & Best Practices
- **API Key Protection**: The Gemini API key is stored securely in the server environment, never exposed to client browsers.
- **Password Security**: Passwords are cryptographically salted and hashed using `bcryptjs`.
- **JWT Authentication**: Protected API endpoints verify tokens via the Authorization header (`Bearer <token>`).
- **Data Protection**: File upload size is validated and limited to 5 MB on the client and 10 MB on the server.
- **XSS Prevention**: Frontend views use `textContent` to render user and AI text, preventing injection attacks.
- **Currency Compliance**: Uses Indian Rupee (`₹`) formatted with standard `en-IN` conventions.
