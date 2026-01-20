# IPO Radar

<div align="center">

<img src="frontend/public/IPO_RADAR_Logo.png" alt="IPO Radar Logo" width="100"/>

**Real-time Indian IPO Intelligence Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)

</div>


## Overview

IPO Radar is a full-stack web application that aggregates Indian mainboard IPO data from multiple trusted sources, providing investors with real-time insights, personalized notifications, and comprehensive analysis in a single dashboard. The platform eliminates the need to visit multiple websites by consolidating data from Chittorgarh, Groww, InvestorGain, and SP Tulsian.

**Why IPO Radar?**
- Saves hours of manual research across multiple platforms
- Provides real-time market updates and live listing prices
- Sends intelligent email notifications based on user preferences
- Offers expert analysis and GMP tracking in one place

## Features

- 🔍 **Multi-Source Data Aggregation** - Consolidates IPO data from 4+ trusted sources
- 📊 **Real-Time Market Data** - Live NIFTY 50 tracking and listing prices via Yahoo Finance
- 🤖 **Automated Scraping** - Twice-daily updates (9 AM & 6 PM IST) with intelligent duplicate detection
- 📧 **Smart Notifications** - Customizable email alerts with frequency control (daily/weekly/monthly)
- 🎯 **Advanced Filtering** - Filter by status, search by name, sort by multiple criteria
- 🔐 **Secure Authentication** - Email/Password and Google OAuth with OTP password reset
- 🌙 **Modern UI** - Responsive design with dark mode and glassmorphism effects
- ⚡ **Performance Optimized** - 15-second cache, batch API calls, efficient database queries

## Tech Stack

**Frontend**
- React 18.3 + Vite 6.3
- TailwindCSS 4.1 + Radix UI
- React Router DOM 7.12
- Google OAuth

**Backend**
- Node.js + Express 5.2
- MongoDB + Mongoose 9.1
- node-cron 4.2
- Nodemailer 7.0
- Helmet + express-rate-limit

**Web Scrapers**
- Python 3.8+
- BeautifulSoup4 + lxml
- Selenium 4.17
- Requests 2.31

## Installation

### Prerequisites

- Node.js 16 or higher
- Python 3.8 or higher
- MongoDB Atlas account (free tier available)
- Gmail account for email notifications

### Setup

```bash
# Clone the repository
git clone https://github.com/Vaibhav-Ningaraju/IPO_Radar.git
cd IPO_Radar

# Install backend dependencies
cd backend
npm install
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Setup environment variables
cd ..
cp .env.example .env
# Edit .env with your credentials
```

## Usage

### Running the Application

```bash
# Terminal 1 - Start Backend Server
cd backend
node server.js
# Server runs on http://localhost:5001

# Terminal 2 - Start Frontend
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Running Scrapers Manually

```bash
cd backend/scrapers
python3 run_all.py
```

### Building for Production

```bash
cd frontend
npm run build
# Output in dist/ directory
```

## Project Structure

```
IPO_Radar/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Reusable UI components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── LoginModal.tsx
│   │   │   │   ├── IPOCard.tsx
│   │   │   │   └── ...
│   │   │   ├── pages/          # Page components
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── IPOPage.tsx
│   │   │   ├── config/         # API configuration
│   │   │   │   └── api.ts
│   │   │   └── utils/          # Helper functions
│   │   └── styles/             # Global styles
│   ├── public/                 # Static assets
│   └── package.json
│
├── backend/                     # Node.js + Express API
│   ├── scrapers/               # Python web scrapers
│   │   ├── chittorgarh_scraper.py
│   │   ├── groww_scraper.py
│   │   ├── investorgain_scraper.py
│   │   ├── sptulsian_scraper.py
│   │   └── run_all.py
│   ├── notifications/          # Email notification system
│   │   ├── notify_subscribers.py
│   │   └── notify_admin.py
│   ├── utils/                  # Shared utilities
│   │   └── mailer.py
│   ├── server.js               # Express API server
│   ├── package.json
│   └── requirements.txt
│
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

## Configuration

Create a `.env` file in the project root:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cluster-name

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Admin Email
ADMIN_EMAIL=admin@example.com

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Port
PORT=5001
```

**Gmail Setup**: Generate an App Password at [Google Account Security](https://myaccount.google.com/apppasswords)

**MongoDB Setup**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | User registration |
| `/api/login` | POST | User login |
| `/api/google-login` | POST | Google OAuth authentication |
| `/api/forgot-password` | POST | Request password reset OTP |
| `/api/reset-password` | POST | Reset password with OTP |
| `/api/ipos` | GET | Fetch all IPOs |
| `/api/live-listings` | GET | Get live listing prices |
| `/api/market-status` | GET | Get NIFTY 50 market data |
| `/api/profile` | GET/POST | User preferences management |
| `/api/admin/scan-duplicates` | GET | Find duplicate IPO entries |
| `/api/admin/merge` | POST | Merge duplicate IPOs |

## Screenshots

<div align="center">

### Dashboard
![Dashboard](Dashboard_Image.png)
### IPO Detail Page
![IPO Detail Page](IPO_Image.png)


</div>


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Vaibhav Ningaraju

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
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## Author

**Vaibhav Ningaraju**

- GitHub: [@Vaibhav-Ningaraju](https://github.com/Vaibhav-Ningaraju)
- Project Link: [https://github.com/Vaibhav-Ningaraju/IPO_Radar](https://github.com/Vaibhav-Ningaraju/IPO_Radar)

## Acknowledgments

- **Data Sources**: [Chittorgarh](https://www.chittorgarh.com), [Groww](https://groww.in), [InvestorGain](https://www.investorgain.com), [SP Tulsian](https://www.sptulsian.com)
- **Market Data**: [Yahoo Finance API](https://finance.yahoo.com)

---

<div align="center">

**Built with ❤️ for the Indian IPO Community**

</div>

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/cloud/atlas)

</div>

## Overview

IPO Radar is a full-stack web application that aggregates Indian mainboard IPO data from multiple trusted sources, providing investors with real-time insights, personalized notifications, and comprehensive analysis in a single dashboard. The platform eliminates the need to visit multiple websites by consolidating data from Chittorgarh, Groww, InvestorGain, and SP Tulsian.

**Why IPO Radar?**
- Saves hours of manual research across multiple platforms
- Provides real-time market updates and live listing prices
- Sends intelligent email notifications based on user preferences
- Offers expert analysis and GMP tracking in one place

## Features

- 🔍 **Multi-Source Data Aggregation** - Consolidates IPO data from 4+ trusted sources
- 📊 **Real-Time Market Data** - Live NIFTY 50 tracking and listing prices via Yahoo Finance
- 🤖 **Automated Scraping** - Twice-daily updates (9 AM & 6 PM IST) with intelligent duplicate detection
- 📧 **Smart Notifications** - Customizable email alerts with frequency control (daily/weekly/monthly)
- 🎯 **Advanced Filtering** - Filter by status, search by name, sort by multiple criteria
- 🔐 **Secure Authentication** - Email/Password and Google OAuth with OTP password reset
- 🌙 **Modern UI** - Responsive design with dark mode and glassmorphism effects
- ⚡ **Performance Optimized** - 15-second cache, batch API calls, efficient database queries

## Tech Stack

**Frontend**
- React 18.3 + Vite 6.3
- TailwindCSS 4.1 + Radix UI
- React Router DOM 7.12
- Google OAuth

**Backend**
- Node.js + Express 5.2
- MongoDB + Mongoose 9.1
- node-cron 4.2
- Nodemailer 7.0
- Helmet + express-rate-limit

**Web Scrapers**
- Python 3.8+
- BeautifulSoup4 + lxml
- Selenium 4.17
- Requests 2.31

## Installation

### Prerequisites

- Node.js 16 or higher
- Python 3.8 or higher
- MongoDB Atlas account (free tier available)
- Gmail account for email notifications

### Setup

```bash
# Clone the repository
git clone https://github.com/Vaibhav-Ningaraju/IPO_Radar.git
cd IPO_Radar

# Install backend dependencies
cd backend
npm install
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Setup environment variables
cd ..
cp .env.example .env
# Edit .env with your credentials
```

## Usage

### Running the Application

```bash
# Terminal 1 - Start Backend Server
cd backend
node server.js
# Server runs on http://localhost:5001

# Terminal 2 - Start Frontend
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Running Scrapers Manually

```bash
cd backend/scrapers
python3 run_all.py
```

### Building for Production

```bash
cd frontend
npm run build
# Output in dist/ directory
```

## Project Structure

```
IPO_Radar/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Reusable UI components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── LoginModal.tsx
│   │   │   │   ├── IPOCard.tsx
│   │   │   │   └── ...
│   │   │   ├── pages/          # Page components
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── IPOPage.tsx
│   │   │   ├── config/         # API configuration
│   │   │   │   └── api.ts
│   │   │   └── utils/          # Helper functions
│   │   └── styles/             # Global styles
│   ├── public/                 # Static assets
│   └── package.json
│
├── backend/                     # Node.js + Express API
│   ├── scrapers/               # Python web scrapers
│   │   ├── chittorgarh_scraper.py
│   │   ├── groww_scraper.py
│   │   ├── investorgain_scraper.py
│   │   ├── sptulsian_scraper.py
│   │   └── run_all.py
│   ├── notifications/          # Email notification system
│   │   ├── notify_subscribers.py
│   │   └── notify_admin.py
│   ├── utils/                  # Shared utilities
│   │   └── mailer.py
│   ├── server.js               # Express API server
│   ├── package.json
│   └── requirements.txt
│
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

## Configuration

Create a `.env` file in the project root:

```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ipo-radar

# Email Configuration (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Admin Email
ADMIN_EMAIL=admin@example.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Server Port
PORT=5001
```

**Gmail Setup**: Generate an App Password at [Google Account Security](https://myaccount.google.com/apppasswords)

**MongoDB Setup**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | User registration |
| `/api/login` | POST | User login |
| `/api/google-login` | POST | Google OAuth authentication |
| `/api/forgot-password` | POST | Request password reset OTP |
| `/api/reset-password` | POST | Reset password with OTP |
| `/api/ipos` | GET | Fetch all IPOs |
| `/api/live-listings` | GET | Get live listing prices |
| `/api/market-status` | GET | Get NIFTY 50 market data |
| `/api/profile` | GET/POST | User preferences management |
| `/api/admin/scan-duplicates` | GET | Find duplicate IPO entries |
| `/api/admin/merge` | POST | Merge duplicate IPOs |

## Screenshots

<div align="center">

### Dashboard
*Main dashboard showing IPO listings with filters and live market data*

### IPO Detail Page
*Comprehensive IPO details with data from multiple sources*

### Notification Preferences
*Customizable email notification settings*

</div>

## Roadmap

- [ ] Mobile application (React Native)
- [ ] SMS notifications via Twilio
- [ ] Advanced analytics dashboard with charts
- [ ] IPO comparison tool
- [ ] Portfolio tracking feature
- [ ] Telegram bot integration
- [ ] Multi-language support (Hindi, English)
- [ ] Historical IPO performance data
- [ ] Watchlist functionality
- [ ] Price alerts and reminders

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write clear, descriptive commit messages
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Vaibhav Ningaraju

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
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## Author

**Vaibhav Ningaraju**

- GitHub: [@Vaibhav-Ningaraju](https://github.com/Vaibhav-Ningaraju)
- Project Link: [https://github.com/Vaibhav-Ningaraju/IPO_Radar](https://github.com/Vaibhav-Ningaraju/IPO_Radar)

## Acknowledgments

- **Data Sources**: [Chittorgarh](https://www.chittorgarh.com), [Groww](https://groww.in), [InvestorGain](https://www.investorgain.com), [SP Tulsian](https://www.sptulsian.com)
- **Market Data**: [Yahoo Finance API](https://finance.yahoo.com)
- **UI Components**: [Radix UI](https://www.radix-ui.com), [Lucide Icons](https://lucide.dev)

---

<div align="center">

**Built with ❤️ for the Indian IPO Community**

</div>
