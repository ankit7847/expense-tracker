# Deployment & GitHub Upload Guide

This guide walks you through uploading the **AI Expense Tracker** project to GitHub and deploying it live for free on **Render** (or any cloud Node.js host).

---

## 1. Preparing the Codebase Locally

1. Open your terminal in the project root directory:
   ```bash
   cd expense-tracker
   ```
2. Verify all dependencies are installed:
   ```bash
   npm install
   ```
3. Test running locally:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

---

## 2. Uploading the Project to GitHub

### Step 1: Create a New GitHub Repository
1. Go to [github.com](https://github.com/) and sign in.
2. Click the **+** icon in the top-right corner and select **New repository**.
3. Name your repository (e.g. `expense-tracker` or `ai-expense-tracker`).
4. Choose **Public** or **Private**.
5. **Do NOT** check "Add a README file", ".gitignore", or "license" (we already have them in our project).
6. Click **Create repository**.

### Step 2: Push Your Local Code to GitHub
In your local terminal, run the following commands:

```bash
# 1. Initialize git repository
git init

# 2. Add all project files (node_modules, .env, and local databases are auto-ignored)
git add .

# 3. Create your first commit
git commit -m "Initial commit: AI-powered Expense Tracker with MVC, Auth, Gemini OCR & MongoDB/SQLite"

# 4. Set branch to main
git branch -M main

# 5. Link your local repo to GitHub (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 6. Push to GitHub
git push -u origin main
```

---

## 3. Deploying to Render (Free Cloud Hosting)

Render provides free hosting for Node.js web services with HTTPS out of the box.

### Step 1: Sign Up / Sign In to Render
1. Visit [render.com](https://render.com/) and sign in (you can log in directly with your GitHub account).

### Step 2: Create a New Web Service
1. On the Render Dashboard, click the **New +** button and select **Web Service**.
2. Select **Build and deploy from a Git repository**.
3. Connect your GitHub account and select your `expense-tracker` repository.

### Step 3: Configure Service Settings
Fill in the deployment details:
- **Name**: `ai-expense-tracker` (or your choice)
- **Region**: Choose the closest region (e.g. *Singapore*, *Oregon*, or *Frankfurt*)
- **Branch**: `main`
- **Root Directory**: (Leave blank)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: **Free**

### Step 4: Add Environment Variables
Under the **Environment Variables** section, click **Add Environment Variable** and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode |
| `GEMINI_API_KEY` | `your_gemini_api_key` | Obtain for free from [Google AI Studio](https://aistudio.google.com/) |
| `JWT_SECRET` | *Random 32-char string* | e.g. `secret_jwt_expense_tracker_2026_xyz` |
| `MONGODB_URI` *(Optional)* | `mongodb+srv://...` | MongoDB Atlas URI. If left blank, app uses built-in SQLite engine |

> **Note**: If you do not provide a `MONGODB_URI`, the server will run the built-in embedded SQLite database automatically. For permanent multi-user persistence across free container restarts on Render, MongoDB Atlas is recommended.

### Step 5: Deploy
Click **Create Web Service**. Render will clone your repo, run `npm install`, and launch the app.
Once the build completes, Render will provide your live URL:
`https://ai-expense-tracker-xxxx.onrender.com`

---

## 4. Setting Up Free MongoDB Atlas (Optional)

If you'd like a free cloud database instead of SQLite:
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (username and password).
4. Under **Network Access**, click **Add IP Address** &rarr; select **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Connect** &rarr; **Drivers** &rarr; copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/expense_tracker?retryWrites=true&w=majority
   ```
6. Add this string as `MONGODB_URI` in your Render Environment Variables (or local `.env`).

---

## 5. Verification Checklist

After deploying, verify the following:
- [ ] Visit your live Render URL.
- [ ] Test the **1-Click Interactive Demo** button on the dashboard to see sample financial charts and trends.
- [ ] Click **Sign In / Create Account** to register a new user and test persistent cloud storage.
- [ ] Upload a receipt image or take a photo to test OCR extraction.
- [ ] Open the **Gemini Assistant** chat drawer and ask questions about your monthly spending.
