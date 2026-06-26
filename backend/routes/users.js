// ============================================================
//  ClinicEase – routes/users.js
//  Admin user management + public doctor listing
// ============================================================
const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router  = express.Router();
router.use(verifyToken);

// GET /api/users/doctors  – public list for booking form
router.get('/doctors', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.full_name, dp.specialisation FROM users u
             LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
             WHERE u.role = 'doctor' ORDER BY u.full_name`
        );
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

// GET /api/users  – admin only
router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, full_name, email, role, phone, gender, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

// POST /api/users  – admin creates doctor/nurse/admin accounts
router.post('/', requireRole('admin'), async (req, res) => {
    try {
        const { full_name, email, password, role, phone, gender, specialisation, qualification } = req.body;
        if (!full_name || !email || !password || !role) return res.status(400).json({ success: false, message: 'All fields required.' });
        const [ex] = await db.query('SELECT id FROM users WHERE email=?', [email]);
        if (ex.length > 0) return res.status(409).json({ success: false, message: 'Email already exists.' });
        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, role, phone, gender) VALUES (?,?,?,?,?,?)',
            [full_name, email, hash, role, phone||null, gender||null]
        );
        if (role === 'doctor' && specialisation) {
            await db.query('INSERT INTO doctor_profiles (user_id, specialisation, qualification) VALUES (?,?,?)',
                [result.insertId, specialisation, qualification||null]);
        }
        res.status(201).json({ success: true, message: 'User created.', userId: result.insertId });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

// DELETE /api/users/:id  – admin removes user
router.delete('/:id', requireRole('admin'), async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself.' });
        await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ success: true, message: 'User deleted.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

// GET /api/users/profile – get own profile
router.get('/profile', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, full_name, email, role, phone, gender, date_of_birth, address, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, data: rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

// PUT /api/users/profile – update own profile
router.put('/profile', async (req, res) => {
    try {
        const { full_name, phone, gender, date_of_birth, address } = req.body;
        await db.query(
            'UPDATE users SET full_name=COALESCE(?,full_name), phone=COALESCE(?,phone), gender=COALESCE(?,gender), date_of_birth=COALESCE(?,date_of_birth), address=COALESCE(?,address) WHERE id=?',
            [full_name||null, phone||null, gender||null, date_of_birth||null, address||null, req.user.id]
        );
        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

// PUT /api/users/change-password – change own password
router.put('/change-password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) return res.status(400).json({ success: false, message: 'Both fields required.' });
        if (new_password.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

        const bcrypt = require('bcryptjs');
        const [rows] = await db.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
        const match = await bcrypt.compare(current_password, rows[0].password_hash);
        if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

module.exports = router;
