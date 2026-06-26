 HEAD
# ClinicEase – Clinic Management System

> Internet Programming 2 · Assessment 3 · ITNP300/ITPR300 · MUT

A full-stack web-based clinic management system built with Node.js, Express, HTML/CSS/JavaScript, and MySQL (via XAMPP).

---

## Features by Role

| Role | Features |
|------|----------|
| **Patient** | Register, login, book appointments, view medical records, vitals, AI symptom checker |
| **Doctor** | View appointments, write diagnoses & prescriptions, auto sentiment analysis on notes |
| **Nurse** | Record patient vitals (BP, temperature, pulse, weight, O₂ sat) |
| **Admin** | Manage all users, create doctor/nurse accounts, view all data |

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL (via XAMPP)
- **Authentication:** JWT (jsonwebtoken) + bcryptjs
- **Security:** Helmet.js, CORS, input validation
- **AI/NLP:** Built-in keyword-based symptom checker + sentiment analysis (no paid APIs)

---

## Setup Instructions

### 1. Prerequisites
- [XAMPP](https://www.apachefriends.org/) installed and running (MySQL service)
- [Node.js](https://nodejs.org/) v18+
- [VS Code](https://code.visualstudio.com/)

### 2. Database Setup
1. Open XAMPP Control Panel → Start **MySQL**
2. Open phpMyAdmin: `http://localhost/phpmyadmin`
3. Import the database schema:
   - Click **Import** → Choose `database/schema.sql` → Go

### 3. Backend Setup
```bash
cd backend
cp .env.example .env         # copy environment config
npm install                  # install all dependencies
node server.js               # start the server
```

The server runs on **http://localhost:3000**

### 4. Access the App
Open your browser and go to: **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Patient registration |
| POST | `/api/auth/login` | Public | Login (all roles) |
| GET | `/api/auth/me` | Auth | Current user info |
| GET | `/api/appointments` | Auth | List appointments |
| POST | `/api/appointments` | Patient/Admin | Book appointment |
| PUT | `/api/appointments/:id` | Doctor/Nurse/Admin | Update appointment |
| DELETE | `/api/appointments/:id` | Auth | Cancel appointment |
| GET | `/api/records` | Auth | Medical records |
| POST | `/api/records` | Doctor | Create record |
| GET | `/api/vitals` | Auth | View vitals |
| POST | `/api/vitals` | Nurse/Admin | Record vitals |
| GET | `/api/users/doctors` | Auth | List doctors |
| GET | `/api/users` | Admin | All users |
| POST | `/api/users` | Admin | Create user |
| POST | `/api/ai/symptom-check` | Auth | AI triage |
| POST | `/api/ai/sentiment` | Auth | Sentiment analysis |

---

## Project Structure

```
clinic-management-system/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── db.js              # MySQL connection pool
│   ├── package.json
│   ├── .env.example       # Environment variables template
│   ├── middleware/
│   │   └── auth.js        # JWT verification + role guards
│   └── routes/
│       ├── auth.js        # Register, login, /me
│       ├── appointments.js
│       ├── records.js
│       ├── vitals.js
│       ├── users.js
│       └── ai.js          # Symptom checker + sentiment
├── frontend/
│   ├── index.html         # Login / Register page
│   ├── js/
│   │   └── api.js         # Shared API helper
│   ├── patient/
│   │   └── dashboard.html
│   ├── doctor/
│   │   └── dashboard.html
│   ├── nurse/
│   │   └── dashboard.html
│   └── admin/
│       └── dashboard.html
└── database/
    └── schema.sql
```

---

## Default Admin Login

After running `schema.sql`, create the admin password hash:

```bash
node -e "const b=require('bcryptjs');b.hash('Admin@1234',10).then(h=>console.log(h))"
```

Copy the output and replace the hash in `schema.sql`, then re-import, OR update it directly in phpMyAdmin.

---

## GitHub Submission Checklist

- [ ] All code pushed to GitHub
- [ ] Lecturer **xpiyose** added as collaborator
- [ ] `.env` is in `.gitignore` (never push secrets)
- [ ] `README.md` is complete
- [ ] `schema.sql` runs without errors
- [ ] `npm install` + `node server.js` starts the server

---

## Learning Units Covered

1. ✅ Web foundations & server-side programming (Node.js + Express)
2. ✅ Client–server communication & RESTful APIs (7 route files, correct HTTP verbs)
3. ✅ User experience design & responsive interfaces (DM Sans, mobile-responsive)
4. ✅ Full-stack integration (frontend ↔ Express ↔ MySQL)
5. ✅ Database design & CRUD (6 tables, full CRUD operations)
6. ✅ Intelligent features — AI/NLP (symptom checker + sentiment analysis)
7. ✅ Security (JWT, bcrypt, Helmet, CORS, input validation, role-based access)
8. ✅ Deployment readiness (.env.example, README, XAMPP instructions)

# ClinicEase
A full-stack clinic management system built with Node.js, Express, MySQL and HTML/CSS/JS. Supports patient, doctor, nurse and admin roles with appointment booking, medical records, AI symptom checker and OTP password reset.
96a9bb697489fbc55f1a28d1235e2ad6d9054f4d
