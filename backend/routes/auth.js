// ============================================================
//  ClinicEase – routes/auth.js
//  POST /api/auth/register
//  POST /api/auth/login
//  GET  /api/auth/me
// ============================================================

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const { verifyToken } = require('../middleware/auth');
const { sendMail, otpEmail, welcomeEmail } = require('../utils/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clinicease_secret_change_me';

// ---------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, role, phone, gender, date_of_birth } = req.body;

        // Basic validation
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        // Only allow patient self-registration; admin creates other roles
        const allowedRole = role === 'patient' ? 'patient' : 'patient';

        // Check for existing user
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, phone, gender, date_of_birth) VALUES (?,?,?,?,?,?,?)',
            [full_name, email, password_hash, allowedRole, phone || null, gender || null, date_of_birth || null]
        );

        // Send welcome email (non-blocking)
        sendMail({ to: email, ...welcomeEmail({ name: full_name, role: allowedRole }) });

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            userId: result.insertId
        });
    } catch (err) {
        console.error('[AUTH/REGISTER]', err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// ---------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Sign JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            message: 'Login successful.',
            token,
            user: {
                id:        user.id,
                full_name: user.full_name,
                email:     user.email,
                role:      user.role
            }
        });
    } catch (err) {
        console.error('[AUTH/LOGIN]', err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ---------------------------------------------------------------
// GET /api/auth/me  – returns current user from token
// ---------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, phone, gender, date_of_birth, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


// ---------------------------------------------------------------
// POST /api/auth/request-otp  – step 1: send OTP to email
router.post('/request-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const [rows] = await db.query('SELECT id, full_name FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            // Don't reveal if email exists
            return res.json({ success: true, message: 'If that email is registered, an OTP has been sent.' });
        }

        const user = rows[0];

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));

        // Expire any existing OTPs for this user
        await db.query('UPDATE password_reset_otp SET used = 1 WHERE user_id = ?', [user.id]);

        // Save new OTP (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await db.query(
            'INSERT INTO password_reset_otp (user_id, otp, expires_at) VALUES (?,?,?)',
            [user.id, otp, expiresAt]
        );

        // Send OTP email
        const emailData = otpEmail({ name: user.full_name, otp });
        const sent = await sendMail({ to: email, ...emailData });

        res.json({
            success: true,
            message: sent
                ? 'An OTP has been sent to your email address. It expires in 10 minutes.'
                : 'OTP generated (email unavailable — dev mode): ' + otp,
            emailSent: sent,
            devOtp: sent ? undefined : otp  // only shown when email not configured
        });
    } catch (err) {
        console.error('[AUTH/REQUEST-OTP]', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/auth/verify-otp  – step 2: verify OTP + set new password
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;
        if (!email || !otp || !new_password) {
            return res.status(400).json({ success: false, message: 'Email, OTP and new password are required.' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        // Find user
        const [userRows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (userRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid request.' });
        }
        const userId = userRows[0].id;

        // Check OTP
        const [otpRows] = await db.query(
            'SELECT id, expires_at FROM password_reset_otp WHERE user_id = ? AND otp = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
            [userId, otp]
        );
        if (otpRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }
        if (new Date() > new Date(otpRows[0].expires_at)) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        // Mark OTP as used
        await db.query('UPDATE password_reset_otp SET used = 1 WHERE id = ?', [otpRows[0].id]);

        // Hash and save new password
        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

        res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('[AUTH/VERIFY-OTP]', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
