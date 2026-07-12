// ============================================================
//  ClinicEase – middleware/auth.js
//  JWT verification + role-based access control
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * verifyToken – validates the Bearer JWT in the Authorization header.
 * Attaches decoded payload to req.user.
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token      = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clinicease_secret_change_me');
        req.user = decoded;  // { id, email, role, full_name }
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

/**
 * requireRole(...roles) – factory that returns middleware
 * allowing only users whose role is in the provided list.
 *
 * Usage:  router.get('/admin-only', verifyToken, requireRole('admin'), handler)
 *         router.get('/staff',      verifyToken, requireRole('doctor','nurse','admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: `Access restricted to: ${roles.join(', ')}`
        });
    }
    next();
};

module.exports = { verifyToken, requireRole };
