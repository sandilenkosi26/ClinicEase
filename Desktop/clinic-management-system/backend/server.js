// ============================================================
//  ClinicEase – server.js
//  Entry point for the Node.js / Express backend
//  Run:  node server.js   OR   nodemon server.js
// ============================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');

// Route imports
const authRoutes        = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const recordRoutes      = require('./routes/records');
const vitalRoutes       = require('./routes/vitals');
const userRoutes        = require('./routes/users');
const aiRoutes          = require('./routes/ai');
const extrasRoutes      = require('./routes/extras');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------
app.use(helmet({
    contentSecurityPolicy: false   // allow inline scripts in dev; tighten for prod
}));

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

//New-allows all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ---------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------
// Serve static frontend files
// ---------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------------------------------------------------------------
// API routes  (all prefixed with /api)
// ---------------------------------------------------------------
app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records',      recordRoutes);
app.use('/api/vitals',       vitalRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/ai',           aiRoutes);
app.use('/api/extras',       extrasRoutes);

// ---------------------------------------------------------------
// Health check
// ---------------------------------------------------------------
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------
// Catch-all: serve frontend for any non-API route (SPA support)
// ---------------------------------------------------------------
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ---------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ---------------------------------------------------------------
// Start server
// ---------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`\n✅  ClinicEase server running on http://localhost:${PORT}`);
    console.log(`📋  API base:  http://localhost:${PORT}/api`);
    console.log(`🌐  Frontend:  http://localhost:${PORT}\n`);
});
