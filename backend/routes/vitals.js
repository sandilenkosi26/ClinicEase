// ============================================================
//  ClinicEase – routes/vitals.js
// ============================================================
const express = require('express');
const db      = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const router  = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const { id, role } = req.user;
        let rows;
        if (role === 'patient') {
            [rows] = await db.query('SELECT v.*, u.full_name AS nurse_name FROM vitals v JOIN users u ON v.nurse_id=u.id WHERE v.patient_id=? ORDER BY v.recorded_at DESC', [id]);
        } else {
            [rows] = await db.query('SELECT v.*, p.full_name AS patient_name, n.full_name AS nurse_name FROM vitals v JOIN users p ON v.patient_id=p.id JOIN users n ON v.nurse_id=n.id ORDER BY v.recorded_at DESC');
        }
        res.json({ success: true, data: rows });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }); }
});

router.post('/', requireRole('nurse', 'admin'), async (req, res) => {
    try {
        const { patient_id, appointment_id, blood_pressure, temperature, pulse, weight, oxygen_saturation } = req.body;
        if (!patient_id) return res.status(400).json({ success: false, message: 'Patient ID required.' });
        const [result] = await db.query(
            'INSERT INTO vitals (patient_id, nurse_id, appointment_id, blood_pressure, temperature, pulse, weight, oxygen_saturation) VALUES (?,?,?,?,?,?,?,?)',
            [patient_id, req.user.id, appointment_id||null, blood_pressure||null, temperature||null, pulse||null, weight||null, oxygen_saturation||null]
        );
        res.status(201).json({ success: true, message: 'Vitals recorded.', vitalId: result.insertId });
    } catch (err) { res.status(500).json({ success: false, message: 'Failed to record vitals.' }); }
});

module.exports = router;
