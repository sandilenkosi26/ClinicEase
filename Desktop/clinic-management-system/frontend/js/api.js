// ============================================================
//  ClinicEase – js/api.js
//  Shared API helper used by all dashboard pages
//  Include with: <script src="../js/api.js"></script>
// ============================================================

const API_BASE = '/api';

/** Get the stored JWT token */
function getToken() {
    return localStorage.getItem('ce_token');
}

/** Get the stored user object */
function getUser() {
    try { return JSON.parse(localStorage.getItem('ce_user') || '{}'); }
    catch { return {}; }
}

/** Log out and redirect to login page */
function logout() {
    localStorage.removeItem('ce_token');
    localStorage.removeItem('ce_user');
    window.location.href = '/index.html';
}

/**
 * apiFetch(endpoint, options)
 * Wraps fetch with auth header and JSON handling.
 * Returns parsed JSON or throws an Error with server message.
 */
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
}

/** Guard: redirect to login if not authenticated or wrong role */
function requireAuth(allowedRoles = []) {
    const token = getToken();
    const user  = getUser();
    if (!token || !user.id) {
        window.location.href = '/index.html';
        return false;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

/** Format date string nicely: "2026-06-02" → "2 June 2026" */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Format time: "09:30:00" → "09:30" */
function formatTime(timeStr) {
    if (!timeStr) return '—';
    return timeStr.slice(0, 5);
}

/** Status badge HTML */
function statusBadge(status) {
    const colors = {
        pending:   'background:#fff8e1;color:#b45309;border:1px solid #fcd34d',
        confirmed: 'background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc',
        completed: 'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7',
        cancelled: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5',
        routine:   'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7',
        moderate:  'background:#fff8e1;color:#b45309;border:1px solid #fcd34d',
        urgent:    'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5',
        normal:    'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7',
        warning:   'background:#fff8e1;color:#b45309;border:1px solid #fcd34d',
        critical:  'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5',
    };
    const style = colors[status] || 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db';
    return `<span style="${style};padding:3px 10px;border-radius:999px;font-size:0.78rem;font-weight:500;text-transform:capitalize;">${status}</span>`;
}
