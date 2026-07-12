// ============================================================
//  ClinicEase – utils/email.js
//  Nodemailer helper for sending transactional emails
//  Install: npm install nodemailer
// ============================================================

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * sendMail({ to, subject, html })
 * Returns true on success, false on failure (never throws).
 */
async function sendMail({ to, subject, html }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('[EMAIL] EMAIL_USER or EMAIL_PASS not set — skipping email.');
        return false;
    }
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `ClinicEase <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`[EMAIL] Sent "${subject}" to ${to}`);
        return true;
    } catch (err) {
        console.error('[EMAIL] Failed to send:', err.message);
        return false;
    }
}

// ── Email templates ──────────────────────────────────────────

function appointmentConfirmationEmail({ patientName, doctorName, date, time, reason }) {
    return {
        subject: 'ClinicEase – Appointment Confirmation',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #cde3dd;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1a6b5a,#0f4a3c);padding:28px 32px">
                <h1 style="color:#fff;font-size:1.4rem;margin:0">ClinicEase</h1>
                <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:0.85rem">Your health, in capable hands.</p>
            </div>
            <div style="padding:28px 32px;background:#fff">
                <h2 style="color:#1c2b27;font-size:1.1rem;margin:0 0 8px">Appointment Confirmed ✓</h2>
                <p style="color:#5a736d;font-size:0.9rem;margin:0 0 20px">Hi ${patientName}, your appointment has been successfully booked.</p>
                <div style="background:#f0f7f5;border-radius:10px;padding:16px 20px;margin-bottom:20px">
                    <table style="width:100%;font-size:0.88rem;border-collapse:collapse">
                        <tr><td style="color:#5a736d;padding:5px 0;width:120px">Doctor</td><td style="color:#1c2b27;font-weight:600">${doctorName}</td></tr>
                        <tr><td style="color:#5a736d;padding:5px 0">Date</td><td style="color:#1c2b27;font-weight:600">${date}</td></tr>
                        <tr><td style="color:#5a736d;padding:5px 0">Time</td><td style="color:#1c2b27;font-weight:600">${time}</td></tr>
                        <tr><td style="color:#5a736d;padding:5px 0">Reason</td><td style="color:#1c2b27">${reason || 'Not specified'}</td></tr>
                    </table>
                </div>
                <p style="color:#5a736d;font-size:0.82rem;margin:0">Please arrive 10 minutes early. To cancel, log in to your ClinicEase account.</p>
            </div>
            <div style="background:#f0f7f5;padding:14px 32px;text-align:center">
                <p style="color:#5a736d;font-size:0.78rem;margin:0">This is an automated message from ClinicEase. Please do not reply.</p>
            </div>
        </div>`
    };
}

function forgotPasswordEmail({ name, tempPassword }) {
    return {
        subject: 'ClinicEase – Your Temporary Password',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #cde3dd;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1a6b5a,#0f4a3c);padding:28px 32px">
                <h1 style="color:#fff;font-size:1.4rem;margin:0">ClinicEase</h1>
            </div>
            <div style="padding:28px 32px;background:#fff">
                <h2 style="color:#1c2b27;font-size:1.1rem;margin:0 0 8px">Password Reset</h2>
                <p style="color:#5a736d;font-size:0.9rem;margin:0 0 20px">Hi ${name}, here is your temporary password. Please change it after logging in.</p>
                <div style="background:#f0f7f5;border-radius:10px;padding:16px 20px;text-align:center;margin-bottom:20px">
                    <span style="font-size:1.5rem;font-weight:700;color:#1a6b5a;letter-spacing:0.1em">${tempPassword}</span>
                </div>
                <p style="color:#c0392b;font-size:0.82rem">If you did not request this, please ignore this email.</p>
            </div>
        </div>`
    };
}

function otpEmail({ name, otp }) {
    return {
        subject: 'ClinicEase – Your Password Reset OTP',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #cde3dd;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1a6b5a,#0f4a3c);padding:28px 32px">
                <h1 style="color:#fff;font-size:1.4rem;margin:0">ClinicEase</h1>
            </div>
            <div style="padding:28px 32px;background:#fff">
                <h2 style="color:#1c2b27;font-size:1.1rem;margin:0 0 8px">Password Reset OTP</h2>
                <p style="color:#5a736d;font-size:0.9rem;margin:0 0 20px">Hi ${name}, use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
                <div style="background:#f0f7f5;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;letter-spacing:0.3em">
                    <span style="font-size:2.2rem;font-weight:700;color:#1a6b5a">${otp}</span>
                </div>
                <p style="color:#c0392b;font-size:0.82rem">If you did not request this, please ignore this email. Do not share this OTP with anyone.</p>
            </div>
        </div>`
    };
}

function welcomeEmail({ name, role }) {
    return {
        subject: 'Welcome to ClinicEase',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #cde3dd;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#1a6b5a,#0f4a3c);padding:28px 32px">
                <h1 style="color:#fff;font-size:1.4rem;margin:0">ClinicEase</h1>
            </div>
            <div style="padding:28px 32px;background:#fff">
                <h2 style="color:#1c2b27;font-size:1.1rem;margin:0 0 8px">Welcome, ${name}! 👋</h2>
                <p style="color:#5a736d;font-size:0.9rem;margin:0 0 16px">Your <strong>${role}</strong> account has been created on ClinicEase.</p>
                <p style="color:#5a736d;font-size:0.9rem">You can now log in at <a href="http://localhost:3000" style="color:#1a6b5a">http://localhost:3000</a></p>
            </div>
        </div>`
    };
}

module.exports = { sendMail, appointmentConfirmationEmail, forgotPasswordEmail, otpEmail, welcomeEmail };
