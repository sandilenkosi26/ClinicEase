// ============================================================
//  ClinicEase – middleware/validate.js
//  Input validation and sanitisation helpers
// ============================================================

function sanitise(value) {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/[<>"'`;]/g, '');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const validateBody = (fields = []) => (req, res, next) => {
    const missing = fields.filter(f => !req.body[f] && req.body[f] !== 0);
    if (missing.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missing.join(', ')}`
        });
    }
    for (const key of Object.keys(req.body)) {
        req.body[key] = sanitise(req.body[key]);
    }
    if (req.body.email && !isValidEmail(req.body.email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }
    next();
};

module.exports = { validateBody, sanitise, isValidEmail };
