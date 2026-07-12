-- ============================================================
--  ClinicEase – Database Schema
--  Run this in phpMyAdmin or MySQL CLI after starting XAMPP
--  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS clinicease;
USE clinicease;

-- ---------------------------------------------------------------
-- 1. USERS  (patients, doctors, nurses, admins share one table)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('patient','doctor','nurse','admin') NOT NULL DEFAULT 'patient',
    phone         VARCHAR(20),
    gender        ENUM('male','female','other'),
    date_of_birth DATE,
    address       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- 2. DOCTOR PROFILES  (extra info for doctors)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL UNIQUE,
    specialisation VARCHAR(100),
    qualification  VARCHAR(150),
    bio            TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 3. APPOINTMENTS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    INT NOT NULL,
    doctor_id     INT NOT NULL,
    appointment_date DATE    NOT NULL,
    appointment_time TIME    NOT NULL,
    reason        TEXT,
    status        ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- 4. MEDICAL RECORDS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_records (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT NOT NULL,
    doctor_id      INT NOT NULL,
    appointment_id INT,
    diagnosis      TEXT,
    prescription   TEXT,
    notes          TEXT,
    sentiment_flag ENUM('normal','warning','critical') DEFAULT 'normal',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- 5. VITALS  (recorded by nurses)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vitals (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      INT NOT NULL,
    nurse_id        INT NOT NULL,
    appointment_id  INT,
    blood_pressure  VARCHAR(20),
    temperature     DECIMAL(4,1),
    pulse           INT,
    weight          DECIMAL(5,2),
    oxygen_saturation DECIMAL(4,1),
    recorded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (nurse_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- 6. SYMPTOM CHECKER LOG  (NLP / AI feature)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS symptom_checks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      INT NOT NULL,
    symptoms_input  TEXT NOT NULL,
    triage_result   ENUM('routine','moderate','urgent') DEFAULT 'routine',
    matched_keywords TEXT,
    checked_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- SEED DATA – default admin account
-- Password: Admin@1234  (bcrypt hash generated at cost 10)
-- Change this password immediately after first login!
-- ---------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role)
VALUES (
    'System Admin',
    'admin@clinicease.com',
    '$2b$10$YourHashHere_ReplaceAfterRunningNodeSeed',
    'admin'
);

-- Sample doctor
INSERT INTO users (full_name, email, password_hash, role, phone, gender)
VALUES (
    'Dr. Nomsa Dlamini',
    'doctor@clinicease.com',
    '$2b$10$YourHashHere_ReplaceAfterRunningNodeSeed',
    'doctor',
    '0812345678',
    'female'
);

INSERT INTO doctor_profiles (user_id, specialisation, qualification)
VALUES (2, 'General Practitioner', 'MBChB – University of KwaZulu-Natal');
