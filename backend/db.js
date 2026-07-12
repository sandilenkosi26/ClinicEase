// ============================================================
//  ClinicEase – db.js
//  MySQL connection pool using mysql2
// ============================================================

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'Mphazima.2673',          // XAMPP default is no password
    database: process.env.DB_NAME     || 'clinicease',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});

// Test the connection on startup
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅  MySQL connected successfully');
        conn.release();
    } catch (err) {
        console.error('❌  MySQL connection failed:', err.message);
        process.exit(1);
    }
})();

module.exports = pool;
