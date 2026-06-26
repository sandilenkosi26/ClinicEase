// ============================================================
//  ClinicEase – routes/records.js
//  GET    /api/records           – list records for current user
//  GET    /api/records/:id       – single record
//  POST   /api/records           – doctor creates record
//  PUT    /api/records/:id       – doctor updates record
// ============================================================

const express = require('express');
const db      = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { analyseSentiment } = require('./ai');

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const { id, role } = req.user;
        let rows;

        if (role === 'patient') {
            [rows] = await db.query(`
                SELECT mr.*, u.full_name AS doctor_name
                FROM medical_records mr
                JOIN users u ON mr.doctor_id = u.id
                WHERE mr.patient_id = ?
                ORDER BY mr.created_at DESC
            `, [id]);
        } else if (role === 'doctor') {
            [rows] = await db.query(`
                SELECT mr.*, u.full_name AS patient_name
                FROM medical_records mr
                JOIN users u ON mr.patient_id = u.id
                WHERE mr.doctor_id = ?
                ORDER BY mr.created_at DESC
            `, [id]);
        } else {
            [rows] = await db.query(`
                SELECT mr.*,
                    p.full_name AS patient_name,
                    d.full_name AS doctor_name
                FROM medical_records mr
                JOIN users p ON mr.patient_id = p.id
                JOIN users d ON mr.doctor_id  = d.id
                ORDER BY mr.created_at DESC
            `);
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch records.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT mr.*, p.full_name AS patient_name, d.full_name AS doctor_name FROM medical_records mr JOIN users p ON mr.patient_id=p.id JOIN users d ON mr.doctor_id=d.id WHERE mr.id=?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found.' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

router.post('/', requireRole('doctor'), async (req, res) => {
    try {
        const { patient_id, appointment_id, diagnosis, prescription, notes } = req.body;
        if (!patient_id || !diagnosis) {
            return res.status(400).json({ success: false, message: 'Patient ID and diagnosis are required.' });
        }
        // Run sentiment analysis automatically on notes
        const sentiment_flag = notes ? analyseSentiment(notes) : 'normal';

        const [result] = await db.query(
            'INSERT INTO medical_records (patient_id, doctor_id, appointment_id, diagnosis, prescription, notes, sentiment_flag) VALUES (?,?,?,?,?,?,?)',
            [patient_id, req.user.id, appointment_id || null, diagnosis, prescription || null, notes || null, sentiment_flag]
        );

        // If appointment linked, mark it completed
        if (appointment_id) {
            await db.query("UPDATE appointments SET status='completed' WHERE id=?", [appointment_id]);
        }

        res.status(201).json({ success: true, message: 'Medical record created.', recordId: result.insertId, sentiment_flag });
    } catch (err) {
        console.error('[RECORDS/POST]', err);
        res.status(500).json({ success: false, message: 'Failed to create record.' });
    }
});

router.put('/:id', requireRole('doctor', 'admin'), async (req, res) => {
    try {
        const { diagnosis, prescription, notes } = req.body;
        const sentiment_flag = notes ? analyseSentiment(notes) : undefined;

        await db.query(
            `UPDATE medical_records SET
                diagnosis    = COALESCE(?, diagnosis),
                prescription = COALESCE(?, prescription),
                notes        = COALESCE(?, notes),
                sentiment_flag = COALESCE(?, sentiment_flag)
             WHERE id = ?`,
            [diagnosis || null, prescription || null, notes || null, sentiment_flag || null, req.params.id]
        );
        res.json({ success: true, message: 'Record updated.', sentiment_flag });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update record.' });
    }
});

module.exports = router;
