# 🎯 IPO Radar

<div align="center">

![IPO Radar Logo](frontend/public/IPO_RADAR_Logo.png)

**Indian Mainboard IPO Intelligence Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-blue)](https://vercel.com)

A comprehensive platform that aggregates IPO data from multiple sources, provides real-time updates, and sends personalized notifications to subscribers.

[Features](#-features) • [Quick Start](#-quick-start) • [Installation](#-installation) • [Deployment](#-deployment) • [API](#-api-documentation)

</div>

---

## � Quick Start

Get IPO Radar running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/Final_IPO_Radar.git
cd Final_IPO_Radar

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and email credentials

# 3. Install dependencies
cd backend && npm install && pip install -r requirements.txt
cd ../frontend && npm install

# 4. Start the application
# Terminal 1 - Backend
cd backend && node server.js

# Terminal 2 - Frontend
cd frontend && npm run dev

# 5. Open http://localhost:5173
```

**First time setup?** See [detailed installation guide](#-installation) below.

---

## �📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🔍 **Multi-Source Data Aggregation**
- **Chittorgarh**: Comprehensive IPO details, financials, and timetables
- **Groww**: IPO strengths, risks, and investment analysis
- **InvestorGain**: Grey Market Premium (GMP) and subscription data
- **SP Tulsian**: Expert analysis and recommendations

### 🔄 **Real-Time Updates**
- Automated scraping twice daily (9 AM & 6 PM IST)
- Live market data integration (NIFTY 50)
- Real-time listing prices via Yahoo Finance API
- Auto-refresh every 15 seconds for live data

### 🎯 **Smart Features**
- **Duplicate Detection**: Fuzzy matching algorithm to identify similar IPO entries
- **One-Click Merge**: Admin dashboard for resolving data conflicts
- **Advanced Filtering**: Filter by status (Open, Upcoming, Closed)
- **Search Functionality**: Quick search across all IPOs
- **Dark Mode**: Eye-friendly dark theme support

### 📧 **Personalized Notifications**
- Customizable email preferences
- Frequency control (daily, weekly, monthly)
- IPO type filters (new IPOs, closing soon, allotment, listing)
- Unsubscribe management

### 🎨 **Modern UI/UX**
- Responsive design (mobile, tablet, desktop)
- Premium glassmorphism effects
- Smooth animations and transitions
- Intuitive navigation

### 🔐 **Authentication**
- Email/Password registration
- Google OAuth integration
- Password reset with OTP (15-minute expiry)
- Secure session management

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18.3 + Vite 6.3
- **Routing**: React Router DOM 7.12
- **Styling**: TailwindCSS 4.1 + Radix UI
- **State Management**: React Hooks
- **Authentication**: Google OAuth (@react-oauth/google)
- **Icons**: Lucide React
- **Theme**: next-themes (dark mode)

### **Backend**
- **Runtime**: Node.js 16+
- **Framework**: Express 5.2
- **Database**: MongoDB (Mongoose 9.1)
- **Authentication**: bcryptjs 3.0
- **Email**: Nodemailer 7.0
- **Scheduling**: node-cron 4.2
- **Security**: Helmet 8.1, express-rate-limit 8.2
- **Market Data**: yahoo-finance2 3.11

### **Scrapers**
- **Language**: Python 3.8+
- **HTTP**: requests 2.31
- **Parsing**: BeautifulSoup4 4.12, lxml 5.1
- **Browser Automation**: Selenium 4.17
- **Database**: pymongo 4.6
- **Environment**: python-dotenv 1.0

### **Deployment**
- **Frontend**: Vercel (Free tier)
- **Backend**: Render / Railway (Free tier)
- **Database**: MongoDB Atlas (M0 Free tier)
- **Email**: Gmail SMTP (Free)

---

## 📁 Project Structure

```
Final_IPO_Radar/
├── frontend/                      # React frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/       # Reusable UI components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── IPOCard.tsx
│   │   │   │   ├── LoginModal.tsx
│   │   │   │   ├── ProfileModal.tsx
│   │   │   │   ├── NotifyMeModal.tsx
│   │   │   │   ├── RecentListings.tsx
│   │   │   │   ├── MarketSentiment.tsx
│   │   │   │   └── MergeConflictsModal.tsx
│   │   │   ├── pages/            # Page components
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── IPOPage.tsx
│   │   │   ├── config/           # Configuration
│   │   │   │   └── api.ts        # API endpoints & config
│   │   │   └── App.tsx           # Root component
│   │   ├── public/               # Static assets
│   │   │   └── IPO_RADAR_Logo.png
│   │   └── index.html
│   ├── .env.production           # Production environment vars
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                       # Node.js backend server
│   ├── scrapers/                 # Python web scrapers
│   │   ├── chittorgarh_scraper.py
│   │   ├── groww_scraper.py
│   │   ├── investorgain_scraper.py
│   │   ├── sptulsian_scraper.py
│   │   └── run_all.py            # Master scraper orchestrator
│   ├── notifications/            # Email notification system
│   │   ├── notify_subscribers.py # User notifications
│   │   └── notify_admin.py       # Admin reports
│   ├── utils/                    # Shared utilities
│   │   └── mailer.py             # Email sender
│   ├── server.js                 # Express API server
│   ├── package.json              # Node dependencies
│   └── requirements.txt          # Python dependencies
│
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
└── README.md                     # This file
```

---

## 🚀 Installation

### **Prerequisites**

Ensure you have the following installed:

- **Node.js** 16+ ([Download](https://nodejs.org/))
- **Python** 3.8+ ([Download](https://www.python.org/))
- **MongoDB Atlas** account ([Sign up](https://www.mongodb.com/cloud/atlas))
- **Gmail** account (for sending emails)
- **Git** ([Download](https://git-scm.com/))

### **1. Clone the Repository**

```bash
git clone https://github.com/YOUR_USERNAME/Final_IPO_Radar.git
cd Final_IPO_Radar
```

### **2. Backend Setup**

#### **Install Python Dependencies**

```bash
cd backend
pip install -r requirements.txt
```

Or using pip3:
```bash
pip3 install -r requirements.txt
```

#### **Install Node.js Dependencies**

```bash
npm install
```

### **3. Frontend Setup**

```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration

### **1. Create Environment File**

Copy the example file and edit it:

```bash
cp .env.example .env
```

### **2. Configure Environment Variables**

Edit `.env` in the **project root** directory:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ipo-radar?retryWrites=true&w=majority

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Admin Email (receives scraper reports)
ADMIN_EMAIL=admin@example.com

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173

# Server Port (optional - auto-assigned in production)
PORT=5001
```

### **3. Gmail App Password Setup**

For `EMAIL_PASS`, you need a Gmail App Password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App Passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `.env`

### **4. MongoDB Atlas Setup**

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist your IP (or use `0.0.0.0/0` for all IPs)
4. Get connection string and add to `.env`

---

## 🎮 Usage

### **Start Backend Server**

```bash
cd backend
node server.js
```

Server runs on `http://localhost:5001`

**Expected output:**
```
✅ Connected to MongoDB
🚀 Server running on port 5001
⏰ Scrapers scheduled for 9:00 AM and 6:00 PM
⏰ Notifications scheduled for 9:30 AM and 6:30 PM
```

### **Start Frontend Development Server**

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

**Expected output:**
```
VITE v6.3.5  ready in 113 ms
➜  Local:   http://localhost:5173/
```

### **Run Scrapers Manually**

```bash
cd backend/scrapers
python3 run_all.py
```

**Expected output:**
```
🔄 Starting IPO Radar Scraper Suite...
✅ Connected to MongoDB
📊 Running Chittorgarh Scraper...
Found 45 IPOs
[1/20] Processing: Acme Corp IPO
   ✅ Saved to MongoDB
...
✅ All scrapers finished successfully!
```

---

## 📚 API Documentation

### **Base URL**
- Development: `http://localhost:5001`
- Production: `https://your-backend-url.com`

### **Authentication Endpoints**

#### **POST** `/api/register`
Register a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### **POST** `/api/login`
Login with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### **POST** `/api/google-login`
Login with Google OAuth

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "googleId": "google-user-id"
}
```

#### **POST** `/api/forgot-password`
Request password reset code

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### **POST** `/api/verify-reset-code`
Verify password reset code

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### **POST** `/api/reset-password`
Reset password with code

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### **IPO Data Endpoints**

#### **GET** `/api/ipos`
Fetch all IPOs

**Response:**
```json
[
  {
    "ipo_name": "Acme Corp IPO",
    "status": "open",
    "url": "https://chittorgarh.com/ipo/acme-ipo/123",
    "groww_url": "https://groww.in/ipo/acme",
    "values": {
      "ipo date": "10 to 15 Jan, 2026",
      "price band": "₹100 to ₹120",
      "lot size": "125 shares",
      "gmp": "₹45",
      "subscription": "12.5x"
    }
  }
]
```

#### **GET** `/api/live-listings`
Get recently listed IPOs with live prices

**Query Parameters:**
- `all=true` - Get all listings (default: recent 10)

**Response:**
```json
[
  {
    "name": "Acme Corp",
    "symbol": "ACME.NS",
    "price": 145.50,
    "changePercent": 21.25,
    "listingPrice": 125.00,
    "issuePrice": 120.00
  }
]
```

#### **GET** `/api/market-status`
Get NIFTY 50 market status

**Response:**
```json
{
  "symbol": "^NSEI",
  "regularMarketPrice": 21850.50,
  "regularMarketChange": 125.30,
  "regularMarketChangePercent": 0.58,
  "sentiment": {
    "qib": "N/A",
    "hni": "N/A",
    "retail": "N/A",
    "totalApplications": "2.4M+",
    "totalAmount": "₹5,200 Cr"
  }
}
```

### **User Profile Endpoints**

#### **GET** `/api/profile?email=user@example.com`
Get user profile and preferences

#### **POST** `/api/profile`
Update user preferences

**Request:**
```json
{
  "email": "user@example.com",
  "preferences": {
    "newIPOs": true,
    "closingSoon": true,
    "allotmentOut": false,
    "listingDate": true,
    "notificationEmail": "user@example.com",
    "frequency": "1day",
    "emailEnabled": true
  }
}
```

### **Admin Endpoints**

#### **GET** `/api/admin/scan-duplicates`
Scan for duplicate IPO entries

**Response:**
```json
[
  {
    "master": { "ipo_name": "Acme Corp IPO", "_id": "..." },
    "candidate": { "ipo_name": "Acme Corporation IPO", "_id": "..." },
    "score": "0.92"
  }
]
```

#### **POST** `/api/admin/merge`
Merge duplicate IPO entries

**Request:**
```json
{
  "masterId": "master-ipo-id",
  "candidateId": "duplicate-ipo-id"
}
```

---

## 🌐 Deployment

### **Free Hosting Setup (Recommended)**

Deploy your application completely free using Vercel + Render + MongoDB Atlas.

#### **1. Deploy Backend to Render**

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new **Web Service**
4. Connect your repository
5. Configure:
   ```
   Name: ipo-radar-backend
   Root Directory: backend
   Build Command: npm install && pip install -r requirements.txt
   Start Command: node server.js
   ```
6. Add environment variables:
   ```
   MONGO_URI=mongodb+srv://...
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ADMIN_EMAIL=admin@example.com
   FRONTEND_URL=https://your-app.vercel.app
   ```
7. Deploy and copy the URL (e.g., `https://your-backend.onrender.com`)

#### **2. Deploy Frontend to Vercel**

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   ```
   Framework: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
5. Deploy

#### **3. Update Backend CORS**

Update `FRONTEND_URL` on Render to your Vercel URL:
```
FRONTEND_URL=https://your-app.vercel.app
```

### **Cost Breakdown**

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel (Frontend) | 100GB bandwidth/month | $0 |
| Render (Backend) | 750 hours/month | $0 |
| MongoDB Atlas | 512MB storage | $0 |
| Gmail SMTP | 500 emails/day | $0 |
| **Total** | | **$0/month** |

---

## 🗄️ Database Schema

### **IPO Collection**

```javascript
{
  _id: ObjectId,
  ipo_name: String,              // "Acme Corp IPO"
  status: String,                // "open" | "upcoming" | "closed"
  url: String,                   // Chittorgarh URL
  groww_url: String,             // Groww URL (optional)
  values: {
    "ipo date": String,          // "10 to 15 Jan, 2026"
    "listing date": String,      // "20 Jan, 2026"
    "price band": String,        // "₹100 to ₹120"
    "issue price": String,       // "₹120"
    "lot size": String,          // "125 shares"
    "gmp": String,               // "₹45"
    "subscription": String,      // "12.5x"
    "logo_url": String,          // Logo image URL
    "strengths": Array,          // From Groww
    "risks": Array,              // From Groww
    "expert_description": String,// From SP Tulsian
  },
  raw_html: {
    ipo_details: String,         // HTML content
    ipo_timetable: String,
    financials: String,
    kpi: String,
    anchor_investors: String,
    expert_analysis_clean: String
  },
  updatedAt: Date
}
```

### **User Collection**

```javascript
{
  _id: ObjectId,
  email: String,                 // Unique
  password: String,              // Hashed with bcrypt
  name: String,
  googleId: String,              // For Google OAuth users
  createdAt: Date,
  preferences: {
    newIPOs: Boolean,
    closingSoon: Boolean,
    allotmentOut: Boolean,
    listingDate: Boolean,
    notificationEmail: String,
    frequency: String,           // "1day" | "1week" | "1month"
    emailEnabled: Boolean,
    lastNotificationSentAt: Date
  }
}
```

### **PasswordReset Collection**

```javascript
{
  _id: ObjectId,
  email: String,
  code: String,                  // 6-digit OTP
  createdAt: Date,               // Auto-expires after 15 minutes
}
```

---

## 🔧 Configuration Options

### **Scraper Limits**

Edit `LIMIT` in each scraper file:

```python
# backend/scrapers/chittorgarh_scraper.py
ipos = ipos[:20]  # Process top 20 IPOs
```

### **Scraping Schedule**

Edit `server.js`:

```javascript
// Run at 9:00 AM and 6:00 PM IST
cron.schedule('0 9,18 * * *', () => {
  // Scraper logic
});

// Run at 9:30 AM and 6:30 PM IST
cron.schedule('30 9,18 * * *', () => {
  // Notification logic
});
```

---

## 🐛 Troubleshooting

### **Scrapers Not Running**

**Problem**: Scrapers fail to execute

**Solutions**:
1. Check MongoDB connection:
   ```bash
   python3 -c "from pymongo import MongoClient; print(MongoClient('YOUR_MONGO_URI').server_info())"
   ```
2. Verify Python dependencies:
   ```bash
   pip3 install -r backend/requirements.txt
   ```
3. Check scraper logs for specific errors

### **Emails Not Sending**

**Problem**: Notification emails not received

**Solutions**:
1. Verify Gmail App Password:
   - Must be 16-character app password (not regular password)
   - 2-Step Verification must be enabled
2. Check `.env` file:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx
   ```
3. Test email manually:
   ```bash
   cd backend/utils
   python3 mailer.py
   ```

### **Frontend Not Connecting to Backend**

**Problem**: API calls fail with CORS errors

**Solutions**:
1. Verify backend is running:
   ```bash
   curl http://localhost:5001/api/ipos
   ```
2. Check CORS configuration in `server.js`:
   ```javascript
   app.use(cors({
     origin: 'http://localhost:5173',
     credentials: true
   }));
   ```
3. Update API URL in frontend:
   ```typescript
   // frontend/src/app/config/api.ts
   const API_URL = 'http://localhost:5001';
   ```

### **MongoDB Connection Errors**

**Problem**: "MongoServerError: Authentication failed"

**Solutions**:
1. Check MongoDB Atlas IP whitelist
2. Verify username/password in connection string
3. Ensure database user has read/write permissions
4. Test connection:
   ```bash
   mongosh "YOUR_MONGO_URI"
   ```

### **Build Errors**

**Problem**: Frontend build fails

**Solutions**:
1. Clear node_modules and reinstall:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Check Node.js version:
   ```bash
   node --version  # Should be 16+
   ```
3. Clear Vite cache:
   ```bash
   rm -rf .vite
   npm run build
   ```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### **Development Guidelines**

- Follow existing code style
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation if needed

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 IPO Radar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Data Sources**: Chittorgarh, Groww, InvestorGain, SP Tulsian
- **Market Data**: Yahoo Finance API
- **UI Components**: Radix UI, Lucide Icons
- **Hosting**: Vercel, Render, MongoDB Atlas

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/YOUR_USERNAME/Final_IPO_Radar/issues)
- **Email**: support@iporadar.com

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Advanced analytics dashboard
- [ ] IPO comparison tool
- [ ] Portfolio tracking
- [ ] Telegram bot integration
- [ ] Multi-language support
- [ ] Historical IPO performance data
- [ ] Watchlist functionality
- [ ] Price alerts

---

<div align="center">

**Built with ❤️ for the Indian IPO Community**

⭐ Star this repo if you find it helpful!

[Report Bug](https://github.com/YOUR_USERNAME/Final_IPO_Radar/issues) • [Request Feature](https://github.com/YOUR_USERNAME/Final_IPO_Radar/issues)

</div>
