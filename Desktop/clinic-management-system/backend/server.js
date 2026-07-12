// ============================================================
//  ClinicEase – server.js
// ============================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');

const authRoutes        = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const recordRoutes      = require('./routes/records');
const vitalRoutes       = require('./routes/vitals');
const userRoutes        = require('./routes/users');
const aiRoutes          = require('./routes/ai');
const extrasRoutes      = require('./routes/extras');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS – allow all origins (works for both local and Netlify) ──
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Security middleware ──
app.use(helmet({ contentSecurityPolicy: false }));

// ── Body parsing ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve static frontend files ──
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API routes ──
app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records',      recordRoutes);
app.use('/api/vitals',       vitalRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/ai',           aiRoutes);
app.use('/api/extras',       extrasRoutes);

// ── Health check ──
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Catch-all ──
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Global error handler ──
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ── Start server ──
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅  ClinicEase server running on http://localhost:${PORT}`);
    console.log(`📋  API base:  http://localhost:${PORT}/api`);
    console.log(`🌐  Frontend:  http://localhost:${PORT}\n`);
});