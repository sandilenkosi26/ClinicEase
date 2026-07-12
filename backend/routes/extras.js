// ============================================================
//  ClinicEase – routes/extras.js
//  Ratings, Notifications, Draft Records
// ============================================================

const express = require('express');
const db      = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router  = express.Router();
router.use(verifyToken);

// ── RATINGS ─────────────────────────────────────────────────

// POST /api/extras/ratings  – patient submits rating
router.post('/ratings', requireRole('patient'), async (req, res) => {
    try {
        const { doctor_id, appointment_id, rating, review } = req.body;
        if (!doctor_id || !appointment_id || !rating) {
            return res.status(400).json({ success: false, message: 'doctor_id, appointment_id and rating are required.' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }
        // Check appointment belongs to this patient and is completed
        const [appt] = await db.query(
            "SELECT id FROM appointments WHERE id=? AND patient_id=? AND status='completed'",
            [appointment_id, req.user.id]
        );
        if (appt.length === 0) {
            return res.status(403).json({ success: false, message: 'You can only rate completed appointments.' });
        }
        await db.query(
            'INSERT INTO doctor_ratings (patient_id, doctor_id, appointment_id, rating, review) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), review=VALUES(review)',
            [req.user.id, doctor_id, appointment_id, rating, review || null]
        );
        res.status(201).json({ success: true, message: 'Rating submitted. Thank you!' });
    } catch (err) {
        console.error('[RATINGS]', err);
        res.status(500).json({ success: false, message: 'Failed to submit rating.' });
    }
});

// GET /api/extras/ratings/doctor/:id  – get avg rating for a doctor
router.get('/ratings/doctor/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM doctor_ratings WHERE doctor_id=?',
            [req.params.id]
        );
        res.json({ success: true, data: { avg_rating: parseFloat(rows[0].avg_rating).toFixed(1) || '0.0', total: rows[0].total } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// GET /api/extras/ratings/check/:appointment_id  – check if patient already rated
router.get('/ratings/check/:appointment_id', requireRole('patient'), async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, rating, review FROM doctor_ratings WHERE appointment_id=? AND patient_id=?',
            [req.params.appointment_id, req.user.id]
        );
        res.json({ success: true, rated: rows.length > 0, data: rows[0] || null });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// ── NOTIFICATIONS ────────────────────────────────────────────

// GET /api/extras/notifications  – get user's notifications
router.get('/notifications', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        const unread = rows.filter(n => !n.is_read).length;
        res.json({ success: true, data: rows, unread });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// PUT /api/extras/notifications/read  – mark all as read
router.put('/notifications/read', async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?', [req.user.id]);
        res.json({ success: true, message: 'Notifications marked as read.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// POST /api/extras/notifications  – internal: create notification (called by other routes)
router.post('/notifications', requireRole('admin', 'doctor', 'nurse'), async (req, res) => {
    try {
        const { user_id, message, type } = req.body;
        await db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)',
            [user_id, message, type || 'system']
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// ── DRAFT RECORDS ────────────────────────────────────────────

// GET /api/extras/drafts  – doctor gets their drafts
router.get('/drafts', requireRole('doctor'), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT d.*, u.full_name AS patient_name FROM draft_records d
             JOIN users u ON d.patient_id = u.id
             WHERE d.doctor_id=? ORDER BY d.updated_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// POST /api/extras/drafts  – save or update draft
router.post('/drafts', requireRole('doctor'), async (req, res) => {
    try {
        const { patient_id, appointment_id, diagnosis, prescription, notes } = req.body;
        if (!patient_id) return res.status(400).json({ success: false, message: 'patient_id required.' });
        // Upsert: one draft per doctor+patient+appointment
        const [existing] = await db.query(
            'SELECT id FROM draft_records WHERE doctor_id=? AND patient_id=? AND (appointment_id=? OR appointment_id IS NULL)',
            [req.user.id, patient_id, appointment_id || null]
        );
        if (existing.length > 0) {
            await db.query(
                'UPDATE draft_records SET diagnosis=?,prescription=?,notes=?,appointment_id=? WHERE id=?',
                [diagnosis||null, prescription||null, notes||null, appointment_id||null, existing[0].id]
            );
            res.json({ success: true, message: 'Draft updated.', draftId: existing[0].id });
        } else {
            const [result] = await db.query(
                'INSERT INTO draft_records (doctor_id, patient_id, appointment_id, diagnosis, prescription, notes) VALUES (?,?,?,?,?,?)',
                [req.user.id, patient_id, appointment_id||null, diagnosis||null, prescription||null, notes||null]
            );
            res.status(201).json({ success: true, message: 'Draft saved.', draftId: result.insertId });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save draft.' });
    }
});

// DELETE /api/extras/drafts/:id  – discard draft
router.delete('/drafts/:id', requireRole('doctor'), async (req, res) => {
    try {
        await db.query('DELETE FROM draft_records WHERE id=? AND doctor_id=?', [req.params.id, req.user.id]);
        res.json({ success: true, message: 'Draft deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed.' });
    }
});

// ── PATIENT FULL HISTORY (for doctor) ───────────────────────

// GET /api/extras/patient-history/:patient_id
router.get('/patient-history/:patient_id', requireRole('doctor', 'admin', 'nurse'), async (req, res) => {
    try {
        const pid = req.params.patient_id;
        const [[patientRows], [records], [vitals], [appts]] = await Promise.all([
            db.query('SELECT id, full_name, email, phone, gender, date_of_birth FROM users WHERE id=?', [pid]),
            db.query('SELECT mr.*, u.full_name AS doctor_name FROM medical_records mr JOIN users u ON mr.doctor_id=u.id WHERE mr.patient_id=? ORDER BY mr.created_at DESC', [pid]),
            db.query('SELECT v.*, u.full_name AS nurse_name FROM vitals v JOIN users u ON v.nurse_id=u.id WHERE v.patient_id=? ORDER BY v.recorded_at DESC', [pid]),
            db.query('SELECT a.*, u.full_name AS doctor_name FROM appointments a JOIN users u ON a.doctor_id=u.id WHERE a.patient_id=? ORDER BY a.appointment_date DESC', [pid])
        ]);
        if (patientRows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
        res.json({ success: true, data: { patient: patientRows[0], records, vitals, appointments: appts } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load patient history.' });
    }
});

module.exports = router;
