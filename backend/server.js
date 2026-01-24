const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const finnhub = require('finnhub');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Finnhub Setup
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_KEY;
const finnhubClient = new finnhub.DefaultApi();

// Helper: Promisified Quote
function getQuote(symbol) {
    return new Promise((resolve, reject) => {
        finnhubClient.quote(symbol, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

// Helper: Batch Quotes (with rate limiting)
async function getBatchQuotes(symbols) {
    const results = {};
    for (const sym of symbols) {
        try {
            const q = await getQuote(sym);
            results[sym] = {
                price: q.c,
                open: q.o,
                high: q.h,
                low: q.l,
                prevClose: q.pc
            };
        } catch (e) {
            console.error(`Quote failed for ${sym}: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 1200)); // 1.2s gap to stay within free tier limits
    }
    return results;
}

// Cache Setup
const CACHE_TTL = 15000; // 15 seconds
const cache = {
    liveListings: { data: null, timestamp: 0 },
    tickerMap: {}, // IPO Name -> Ticker Symbol
    listingPriceMap: {}, // Symbol -> Listing Price
};

const app = express();
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Trust proxy - Required for Render deployment
// This allows Express to trust the X-Forwarded-For header from Render's proxy
app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://iporadar.vercel.app',
    'https://ipo-radar.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

console.log('🌐 Allowed CORS Origins:', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Request Logging (Production)
if (isProduction) {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Helper Functions
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, '').trim();
};

// Constants
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 6;
const BCRYPT_ROUNDS = 10;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { dbName: 'ipo-radar' })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        console.error('Cannot start server without database connection');
        process.exit(1);
    });

// --- SCHEMAS ---

// User Schema
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false }, // Made optional for Google Login
    name: { type: String, default: 'User' },
    googleId: { type: String, unique: true, sparse: true }, // Store Google ID
    preferences: {
        newIPOs: { type: Boolean, default: true },
        closingSoon: { type: Boolean, default: true },
        allotmentOut: { type: Boolean, default: false },
        listingDate: { type: Boolean, default: false },
        notificationEmail: { type: String, default: '' },
        frequency: { type: String, default: '1day' },
        emailEnabled: { type: Boolean, default: false },
        lastNotificationSentAt: { type: Date }
    }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// IPO Schema
const IPOSchema = new mongoose.Schema({
    ipo_name: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    groww_url: { type: String }, // Add specific field for Groww
    status: { type: String, default: 'unknown' },
    values: { type: mongoose.Schema.Types.Mixed }, // Flexible key-value pairs for extracted details
    raw_html: { type: Map, of: String } // Store raw HTML sections if needed
}, { timestamps: true, strict: false }); // Disable strict mode to allow other fields just in case

const IPO = mongoose.model('IPO', IPOSchema);

// Password Reset Schema
const PasswordResetSchema = new mongoose.Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 900 }
});

const PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema);


// --- API ROUTES ---

// Register New User
app.post('/api/register', async (req, res) => {
    let { email, password, name } = req.body;

    // Validate inputs
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Email validation
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password validation
    if (password.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    }

    // Sanitize inputs
    email = sanitizeInput(email);
    name = name ? sanitizeInput(name) : email.split('@')[0];

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            preferences: {
                notificationEmail: ''
            }
        });
        await user.save();

        res.status(201).json({
            message: 'Registration successful',
            user: {
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login Existing User
app.post('/api/login', async (req, res) => {
    let { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Email validation
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    email = sanitizeInput(email);

    try {
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user registered via Google (no password)
        if (!user.password) {
            return res.status(401).json({ error: 'Please use Google login for this account' });
        }

        // Compare password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            message: 'Login successful',
            user: {
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Google OAuth Login
app.post('/api/google-login', async (req, res) => {
    let { email, name, googleId } = req.body;

    // Validate inputs
    if (!email || !googleId) {
        return res.status(400).json({ error: 'Email and Google ID are required' });
    }

    // Email validation
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    email = sanitizeInput(email);
    name = name ? sanitizeInput(name) : email.split('@')[0];

    try {
        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user
            user = new User({
                email,
                name,
                googleId,
                preferences: {
                    notificationEmail: ''
                }
            });
            await user.save();
        } else if (!user.googleId) {
            // Link existing user
            user.googleId = googleId;
            await user.save();
        }

        res.json({
            message: 'Google login successful',
            user: {
                name: user.name,
                email: user.email,
                preferences: user.preferences
            }
        });

    } catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ error: 'Server error during Google login' });
    }
});


// Forgot Password - Send Reset Code
app.post('/api/forgot-password', async (req, res) => {
    let { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    email = sanitizeInput(email);

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            // For security, don't reveal if email exists
            return res.json({ message: 'If an account exists, a reset code has been sent to your email' });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Delete any existing reset codes for this email
        await PasswordReset.deleteMany({ email });



        // Store code in MongoDB (auto-expires in 15 minutes)
        await PasswordReset.create({ email, code });

        // Send email using SendGrid (more reliable than Gmail SMTP)
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            try {
                await sgMail.send({
                    to: email,
                    from: process.env.EMAIL_USER, // Must be verified in SendGrid
                    subject: 'IPO Radar - Password Reset Code',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>Password Reset Request</h2>
                            <p>Your password reset code is:</p>
                            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                                ${code}
                            </div>
                            <p>This code will expire in 15 minutes.</p>
                            <p>If you didn't request this, please ignore this email.</p>
                        </div>
                    `
                });
                console.log(`✅ Password reset email sent to: ${email}`);
            } catch (emailError) {
                console.error('❌ SendGrid email failed:', emailError.message);
                // Still return success to user (don't reveal if email exists)
            }
        } else {
            console.error('❌ SENDGRID_API_KEY not configured');
        }

        res.json({ message: 'If an account exists, a reset code has been sent to your email' });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to send reset code' });
    }
});

// Verify Reset Code
app.post('/api/verify-reset-code', async (req, res) => {
    let { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    email = sanitizeInput(email);

    try {
        const resetRecord = await PasswordReset.findOne({ email, code });

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        res.json({ message: 'Code verified successfully' });
    } catch (err) {
        console.error('Verify reset code error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Reset Password - Verify Code and Update
app.post('/api/reset-password', async (req, res) => {
    let { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    }

    email = sanitizeInput(email);

    try {
        // Check if code exists and is valid
        const resetRecord = await PasswordReset.findOne({ email, code });
        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        // Code is valid, update password
        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await User.findOneAndUpdate(
            { email },
            { $set: { password: hashedPassword } }
        );

        // Delete the reset code
        await PasswordReset.deleteOne({ email, code });

        res.json({ message: 'Password reset successful' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Update Profile / Preferences
app.post('/api/profile', async (req, res) => {
    let { email, name, preferences } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    email = sanitizeInput(email);

    try {
        // Build update object - only update fields that are provided
        const updateFields = {};
        if (preferences !== undefined) {
            updateFields.preferences = preferences;
        }
        if (name !== undefined && name.trim()) {
            updateFields.name = sanitizeInput(name.trim());
        }

        const user = await User.findOneAndUpdate(
            { email },
            { $set: updateFields },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get Profile
// Using query param ?email=... or could use body if POST
app.get('/api/profile', async (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: 'Email query parameter required' });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.json({}); // Return empty if not found, preserving old behavior
        res.json({
            name: user.name,
            email: user.email,
            preferences: user.preferences
        });
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Unsubscribe from email notifications
app.post('/api/unsubscribe', async (req, res) => {
    let { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    email = sanitizeInput(email);

    try {
        const user = await User.findOneAndUpdate(
            { email },
            {
                $set: {
                    'preferences.emailEnabled': false,
                    'preferences.newIPOs': false,
                    'preferences.closingSoon': false,
                    'preferences.listingDate': false,
                    'preferences.allotmentStatus': false
                }
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Successfully unsubscribed from email notifications',
            success: true
        });
    } catch (err) {
        console.error('Unsubscribe error:', err);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// --- LIVE MARKET ROUTES ---

// Helper: Find Ticker with Rate Limiting
// Helper: Find Ticker with Rate Limiting (Queued)
async function findTicker(ipoName) {
    if (cache.tickerMap[ipoName] !== undefined) {
        return cache.tickerMap[ipoName];
    }

    const query = ipoName
        .replace(/IPO|Limited|Ltd|Pvt|Private|Public|Ltd\.|Limited\./gi, '')
        .trim();

    try {
        const results = await yahooCall(() =>
            yahooFinance.search(query)
        );

        if (!results.quotes || !Array.isArray(results.quotes)) {
            cache.tickerMap[ipoName] = null;
            return null;
        }

        const match = results.quotes.find(q => q.symbol && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')));

        if (match) {
            cache.tickerMap[ipoName] = match.symbol;
            return match.symbol;
        }
    } catch (err) {
        console.error(`Ticker search failed for ${ipoName}:`, err.message);
    }

    // Cache null if failed or not found to avoid retrying immediately
    cache.tickerMap[ipoName] = null;
    return null;
}

async function getListingPrice(symbol) {
    if (cache.listingPriceMap[symbol]) {
        return cache.listingPriceMap[symbol];
    }

    try {
        const chart = await yahooCall(() =>
            yahooFinance.chart(symbol, { period1: '2000-01-01', interval: '1d' })
        );

        const first = chart?.quotes?.[0];
        if (first?.open) {
            cache.listingPriceMap[symbol] = first.open;
            return first.open;
        }
    } catch (e) {
        console.error(`Chart failed for ${symbol}:`, e.message);
    }

    return null;
}



// 2. Live Listings
app.get('/api/live-listings', async (req, res) => {
    const now = Date.now();
    // Cache check currently disabled until stability verification
    if (cache.liveListings.data && (now - cache.liveListings.timestamp < CACHE_TTL)) {
        const showAll = req.query.all === 'true';
        const data = cache.liveListings.data;
        return res.json(showAll ? data : data.slice(0, 5));
    }

    try {
        // Fetch ALL IPOs (filter client-side or here)
        // We want anything that seems "Listed". 
        // Logic: Has a 'listing date' OR status='closed' OR 'listing at' is populated.
        // Let's just grab all and filter.
        const allIPOs = await IPO.find().sort({ updatedAt: -1 });

        // Helper to parse currency strings like "₹109 per share"
        const parsePrice = (str) => {
            if (!str) return 0;
            const cleaned = str.toString().replace(/[^\d.]/g, '');
            const val = parseFloat(cleaned);
            return isNaN(val) ? 0 : val;
        };

        // Helper to parse dates
        const parseDate = (str) => {
            if (!str) return null;
            // Try standard parse
            const d = new Date(str);
            if (!isNaN(d.getTime())) return d;
            return null;
        };

        const listedIPOs = allIPOs.filter(ipo => {
            const listingAt = ipo.values?.['listing at'];
            const listingDateStr = ipo.values?.['listing date'] || ipo.values?.['listed on'];

            // STRICT CHECK: Must have a listing date AND that date must be in the past
            if (listingDateStr) {
                const d = parseDate(listingDateStr);
                // If date is valid and is in the past (including today)
                // Buffer: end of today
                if (d && d <= new Date()) {
                    return true;
                }
            }

            // Fallback
            const price = parsePrice(listingAt);
            if (price > 0) return true;

            return false;
        });

        const liveData = [];
        const symbolsToFetch = [];
        const ipoMap = {}; // symbol -> ipo obj

        // 1. Symbol Identification Phase
        for (const ipo of listedIPOs) {
            let symbol = ipo.values?.symbol; // Check if already saved in DB (we previously didn't save this) but let's assume we might start saving it in future.

            // If not in DB, try to find it
            if (!symbol) {
                // Check in-memory cache
                symbol = await findTicker(ipo.ipo_name);

                // If found, let's SAVE it to DB for future speed!
                if (symbol) {
                    // We update the document in background to persist symbol
                    // We add it to 'values' object or root? Mongoose 'strict: false' allows root.
                    // But schema defined `values: Object`. Let's put it in `values.symbol` for consistency?
                    // Or separate field? Let's assume we modify the IPO document itself.
                    // Wait, `ipo` is a mongoose doc.

                    // Optimization: Fire and forget update
                    IPO.updateOne({ _id: ipo._id }, { $set: { "values.symbol": symbol } }).catch(e => console.error("DB Update failed", e));
                }
            }

            if (symbol) {
                symbolsToFetch.push(symbol);
                ipoMap[symbol] = ipo;
            }
        }

        // Deduplicate symbols
        const uniqueSymbols = [...new Set(symbolsToFetch)];

        // 2. Batch Data Fetching
        let quotesMap = {};
        if (uniqueSymbols.length > 0) {
            try {
                quotesMap = await getBatchQuotes(uniqueSymbols);
            } catch (e) {
                console.error("Batch quote failed:", e.message);
            }
        }

        // 3. Map Data Back to IPOs
        for (const symbol of uniqueSymbols) {
            const quote = quotesMap[symbol];
            const ipo = ipoMap[symbol];
            if (!ipo || !quote) continue;

            // Priority 1: Check In-Memory Cache for Historical Listing Price
            let listingPrice = cache.listingPriceMap[symbol];

            // Priority 2: Fetch from API History (Skipped for Finnhub Free Tier)

            // Priority 3: Fallback to Scraped Data
            if (!listingPrice) {
                const listingAtVal = ipo.values?.['listing at'];
                listingPrice = parsePrice(listingAtVal);
            }

            const issuePriceVal = parsePrice(ipo.values?.['issue price']);

            const currentPrice = quote.price;
            const issuePrice = issuePriceVal;

            // Calculate gain
            let changePercent = 0;
            if (issuePrice > 0) {
                changePercent = ((currentPrice - issuePrice) / issuePrice) * 100;
            }

            if (currentPrice > 0) {
                liveData.push({
                    name: ipo.ipo_name,
                    symbol: symbol,
                    price: currentPrice,
                    changePercent: changePercent,
                    listingPrice: listingPrice,
                    issuePrice: issuePrice
                });
            }
        }

        // Return top 5 OR all if requested
        const showAll = req.query.all === 'true';
        const result = showAll ? liveData : liveData.slice(0, 5);

        cache.liveListings = { data: liveData, timestamp: now };

        res.json(result);

    } catch (err) {
        console.error('Live listings fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch live listings' });
    }
});

// Root route - API status
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'IPO Radar API Server',
        version: '1.0.0',
        endpoints: {
            ipos: '/api/ipos',
            liveListings: '/api/live-listings',
            marketStatus: '/api/market-status',
            auth: {
                register: '/api/register',
                login: '/api/login',
                googleLogin: '/api/google-login'
            }
        },
        documentation: 'https://github.com/Vaibhav-Ningaraju/IPO_Radar'
    });
});

// Fetch IPOs
app.get('/api/ipos', async (req, res) => {
    try {
        const ipos = await IPO.find().sort({ updatedAt: -1 }).lean();
        res.json(ipos);
    } catch (err) {
        console.error('Error fetching IPOs:', err);
        res.status(500).json({ error: 'Failed to fetch IPO data' });
    }
});

// Internal: Create/Update IPO (for Scraper)
app.post('/api/ipos', async (req, res) => {
    try {
        const ipoData = req.body;
        // Upsert based on ipo_name
        const result = await IPO.findOneAndUpdate(
            { ipo_name: ipoData.ipo_name },
            ipoData,
            { upsert: true, new: true }
        );
        res.json({ message: 'IPO saved', result });
    } catch (err) {
        console.error('Error saving IPO:', err);
        res.status(500).json({ error: 'Failed to save IPO data' });
    }
});


// --- HELPER: Similarity ---
function getJaccardSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(/[^a-z0-9]+/));
    const set2 = new Set(str2.toLowerCase().split(/[^a-z0-9]+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

// --- ADMIN API ROUTES ---

// Scan for duplicates
app.get('/api/admin/scan-duplicates', async (req, res) => {
    try {
        const ipos = await IPO.find().sort({ ipo_name: 1 });
        const candidates = [];
        const processed = new Set();

        for (let i = 0; i < ipos.length; i++) {
            for (let j = i + 1; j < ipos.length; j++) {
                const a = ipos[i];
                const b = ipos[j];
                const pairKey = [a._id, b._id].sort().join('-');

                if (processed.has(pairKey)) continue;

                // Simple metric: Jaccard Similarity of tokens
                const score = getJaccardSimilarity(a.ipo_name, b.ipo_name);

                // Threshold: >= 0.3 seems reasonable
                // Allow 1.0 for cases where tokens are identical but order differs
                if (score >= 0.3) {
                    candidates.push({
                        master: a,
                        candidate: b,
                        score: score.toFixed(2)
                    });
                    processed.add(pairKey);
                }
            }
        }

        candidates.sort((a, b) => b.score - a.score);
        res.json(candidates.slice(0, 50));

    } catch (err) {
        console.error('Scan error:', err);
        res.status(500).json({ error: 'Scan failed' });
    }
});

// Execute Merge
// Execute Merge (POST - API)
app.post('/api/admin/merge', async (req, res) => {
    const { masterId, candidateId } = req.body;
    await performMerge(masterId, candidateId, res);
});

// Execute Merge (GET - One-Click Link)
app.get('/api/merge', async (req, res) => {
    const { keep, merge } = req.query;
    if (!keep || !merge) return res.send("Missing parameters");

    try {
        const master = await IPO.findById(keep);
        const candidate = await IPO.findById(merge);

        if (!master || !candidate) return res.send("IPO not found");

        const mergedValues = { ...master.values, ...candidate.values };
        const mergedGrowwUrl = master.groww_url || candidate.groww_url;

        await IPO.findByIdAndUpdate(keep, {
            $set: {
                values: mergedValues,
                groww_url: mergedGrowwUrl,
            }
        });

        await IPO.findByIdAndDelete(merge);

        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: green;">✅ Merge Successful</h1>
                <p>Merged <strong>${candidate.ipo_name}</strong> into <strong>${master.ipo_name}</strong>.</p>
                <p>The duplicate has been deleted.</p>
                <br>
                <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px;">Close Window</button>
            </div>
        `);

    } catch (err) {
        res.send(`<h1>❌ Error: ${err.message}</h1>`);
    }
});

async function performMerge(masterId, candidateId, res) {
    try {
        const master = await IPO.findById(masterId);
        const candidate = await IPO.findById(candidateId);

        if (!master || !candidate) {
            return res.status(404).json({ error: 'One or both IPOs not found' });
        }

        const mergedValues = { ...master.values, ...candidate.values };
        const mergedHtml = { ...master.raw_html || {}, ...candidate.raw_html || {} };
        const mergedGrowwUrl = master.groww_url || candidate.groww_url;

        const statusPriority = { 'open': 4, 'upcoming': 3, 'closed': 2, 'unknown': 1 };
        const s1 = master.status || 'unknown';
        const s2 = candidate.status || 'unknown';
        const mergedStatus = (statusPriority[s2] || 0) > (statusPriority[s1] || 0) ? s2 : s1;

        await IPO.findByIdAndUpdate(masterId, {
            $set: {
                values: mergedValues,
                raw_html: mergedHtml,
                groww_url: mergedGrowwUrl,
                status: mergedStatus
            }
        });

        await IPO.findByIdAndDelete(candidateId);

        if (res.json) {
            res.json({ success: true, message: `Merged "${candidate.ipo_name}" into "${master.ipo_name}"` });
        }

    } catch (err) {
        console.error('Merge error:', err);
        if (res.json) res.status(500).json({ error: 'Merge failed' });
    }
}

// --- SCHEDULER ---

// 1. Run Scrapers at 9:00 AM and 6:00 PM IST (3:30 AM and 12:30 PM UTC)
// Cron runs in UTC on Render, so we need to subtract 5:30 from IST
cron.schedule('30 3,12 * * *', () => {
    console.log('⏰ Running Scheduled Scrapers (9 AM or 6 PM IST)...');
    exec('cd scrapers && python3 run_all.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Scraper Script Error: ${error.message}`);
            // TODO: Send alert email to admin
            return;
        }
        if (stderr) {
            console.error(`⚠️ Scraper Script StdErr: ${stderr}`);
        }
        console.log(`✅ Scraper Script Output:\n${stdout}`);
    });
}, {
    timezone: "UTC"
});

// 2. Run Notifications at 9:30 AM and 6:30 PM IST (4:00 AM and 1:00 PM UTC)
cron.schedule('0 4,13 * * *', () => {
    console.log('⏰ Running Scheduled Notification Script (9:30 AM or 6:30 PM IST)...');
    exec('cd notifications && python3 notify_subscribers.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Notification Script Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ Notification Script StdErr: ${stderr}`);
        }
        console.log(`✅ Notification Script Output:\n${stdout}`);
    });
}, {
    timezone: "UTC"
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
