// ============================================================
//  ClinicEase – routes/appointments.js
// ============================================================

const express = require('express');
const db      = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { sendMail, appointmentConfirmationEmail } = require('../utils/email');

const router = express.Router();
router.use(verifyToken);

// GET /api/appointments
router.get('/', async (req, res) => {
    try {
        const { id, role } = req.user;
        let rows;
        if (role === 'patient') {
            [rows] = await db.query(`
                SELECT a.*, u.full_name AS doctor_name, dp.specialisation
                FROM appointments a
                JOIN users u ON a.doctor_id = u.id
                LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
                WHERE a.patient_id = ?
                ORDER BY a.appointment_date DESC, a.appointment_time DESC`, [id]);
        } else if (role === 'doctor') {
            [rows] = await db.query(`
                SELECT a.*, u.full_name AS patient_name, u.phone AS patient_phone
                FROM appointments a
                JOIN users u ON a.patient_id = u.id
                WHERE a.doctor_id = ?
                ORDER BY a.appointment_date ASC, a.appointment_time ASC`, [id]);
        } else {
            [rows] = await db.query(`
                SELECT a.*, p.full_name AS patient_name, d.full_name AS doctor_name
                FROM appointments a
                JOIN users p ON a.patient_id = p.id
                JOIN users d ON a.doctor_id  = d.id
                ORDER BY a.appointment_date DESC, a.appointment_time DESC`);
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch appointments.' });
    }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT a.*, p.full_name AS patient_name, p.email AS patient_email,
                   p.phone AS patient_phone, d.full_name AS doctor_name
            FROM appointments a
            JOIN users p ON a.patient_id = p.id
            JOIN users d ON a.doctor_id  = d.id
            WHERE a.id = ?`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found.' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// POST /api/appointments – book + send confirmation email
router.post('/', requireRole('patient', 'admin'), async (req, res) => {
    try {
        const { doctor_id, appointment_date, appointment_time, reason } = req.body;
        const patient_id = req.user.role === 'admin' ? req.body.patient_id : req.user.id;

        if (!doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ success: false, message: 'Doctor, date and time are required.' });
        }

        // Conflict check
        const [conflicts] = await db.query(
            `SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ?
             AND appointment_time = ? AND status != 'cancelled'`,
            [doctor_id, appointment_date, appointment_time]
        );
        if (conflicts.length > 0) {
            return res.status(409).json({ success: false, message: 'That time slot is already booked. Please choose another.' });
        }

        const [result] = await db.query(
            'INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason) VALUES (?,?,?,?,?)',
            [patient_id, doctor_id, appointment_date, appointment_time, reason || null]
        );

        // Send confirmation email in background
        try {
            const [patientRows] = await db.query('SELECT full_name, email FROM users WHERE id = ?', [patient_id]);
            const [doctorRows]  = await db.query('SELECT full_name FROM users WHERE id = ?', [doctor_id]);
            if (patientRows.length && patientRows[0].email) {
                const formattedDate = new Date(appointment_date).toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
                const formattedTime = appointment_time.slice(0, 5);
                const emailData = appointmentConfirmationEmail({
                    patientName: patientRows[0].full_name,
                    doctorName:  'Dr. ' + doctorRows[0].full_name,
                    date:        formattedDate,
                    time:        formattedTime,
                    reason:      reason || 'Not specified'
                });
                sendMail({ to: patientRows[0].email, ...emailData });
            }
        } catch (emailErr) {
            console.warn('[EMAIL] Could not send confirmation:', emailErr.message);
        }

        res.status(201).json({ success: true, message: 'Appointment booked. A confirmation email has been sent.', appointmentId: result.insertId });
    } catch (err) {
        console.error('[APPOINTMENTS/POST]', err);
        res.status(500).json({ success: false, message: 'Failed to book appointment.' });
    }
});

// PUT /api/appointments/:id
router.put('/:id', requireRole('doctor', 'admin', 'nurse'), async (req, res) => {
    try {
        const { status, notes } = req.body;
        await db.query(
            'UPDATE appointments SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?',
            [status || null, notes || null, req.params.id]
        );
        // Create notification for patient when status changes
        if (status) {
            const [appt] = await db.query('SELECT patient_id, appointment_date FROM appointments WHERE id=?', [req.params.id]);
            if (appt.length > 0) {
                const dateStr = new Date(appt[0].appointment_date).toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' });
                const messages = {
                    confirmed:  'Your appointment on ' + dateStr + ' has been confirmed.',
                    completed:  'Your appointment on ' + dateStr + ' has been marked as completed.',
                    cancelled:  'Your appointment on ' + dateStr + ' has been cancelled.'
                };
                if (messages[status]) {
                    await db.query(
                        'INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)',
                        [appt[0].patient_id, messages[status], 'appointment']
                    );
                }
            }
        }
        res.json({ success: true, message: 'Appointment updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update appointment.' });
    }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id, role } = req.user;
        const [rows] = await db.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
        if (role === 'patient' && rows[0].patient_id !== id) {
            return res.status(403).json({ success: false, message: 'You can only cancel your own appointments.' });
        }
        await db.query("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: 'Appointment cancelled.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to cancel appointment.' });
    }
});

module.exports = router;
