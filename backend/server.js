/**
 * server.js — ERP Backend Entry Point
 *
 * Express REST API server for the dummy ERP system.
 * Handles authentication (JWT) and student CRUD operations.
 * On startup, runs database migrations and seeds the default admin user.
 *
 * Environment variables (set in .env or docker-compose.yml):
 *   PORT          — port to listen on (default: 5000)
 *   JWT_SECRET    — secret key used to sign JWT tokens
 *   DB_HOST       — PostgreSQL host
 *   DB_PORT       — PostgreSQL port (default: 5432)
 *   DB_USER       — PostgreSQL username
 *   DB_PASSWORD   — PostgreSQL password
 *   DB_NAME       — PostgreSQL database name
 *
 * Routes:
 *   POST   /api/auth/login      — login, returns JWT token
 *   GET    /api/students        — list all students (auth required)
 *   GET    /api/students/:id    — get single student (auth required)
 *   POST   /api/students        — add student (auth required)
 *   DELETE /api/students/:id    — delete student (auth required)
 *   GET    /api/health          — health check
 */

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

/**
 * PostgreSQL connection pool.
 * Reuses connections across requests instead of opening a new one each time.
 * Config is read from environment variables so it works both locally and in Docker.
 */
const pool = new Pool({
  user: process.env.DB_USER || 'erpuser',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'erpdatabase',
  password: process.env.DB_PASSWORD || 'erppassword',
  port: process.env.DB_PORT || 5432,
});

/**
 * runMigrations
 *
 * Reads all .sql files from the migrations/ folder in alphabetical order
 * and runs any that have not been applied yet.
 *
 * Tracks applied migrations in the schema_migrations table so they are
 * never run twice — safe to call on every server restart.
 *
 * To add a new migration: create migrations/003_your_change.sql and restart the server.
 */
const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const already = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (already.rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    console.log(`✓ Migration applied: ${file}`);
  }

  console.log('✓ All migrations up to date');
};

/**
 * seedAdmin
 *
 * Creates the default admin user (admin / admin123) if no admin user exists.
 * Runs once on first startup. Password is bcrypt hashed before storing.
 * Safe to call on every restart — skips if user already exists.
 */
const seedAdmin = async () => {
  const exists = await pool.query('SELECT 1 FROM users WHERE username = $1', ['admin']);
  if (exists.rows.length === 0) {
    const hashed = await bcrypt.hash('admin123', 10);
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', ['admin', hashed]);
    console.log('✓ Seeded default user: admin / admin123');
  }
};

/**
 * initDatabase
 *
 * Entry point for all database setup. Called once when the server starts.
 * Runs migrations first, then seeds default data.
 * Exits the process if setup fails — no point running with a broken DB.
 */
const initDatabase = async () => {
  try {
    await runMigrations();
    await seedAdmin();
  } catch (error) {
    console.error('Database initialization error:', error.message);
    process.exit(1);
  }
};

/**
 * authenticateToken — Express middleware
 *
 * Validates the JWT token from the Authorization header (Bearer <token>).
 * Attaches the decoded user payload to req.user if valid.
 * Returns 401 if token is missing, 403 if token is invalid or expired.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== ROUTES ====================

/**
 * POST /api/auth/login
 *
 * Authenticates a user with username and password.
 * Returns a signed JWT token (expires in 24h) on success.
 *
 * Body:     { username: string, password: string }
 * Response: { message, token, user: { id, username } }
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/students
 *
 * Returns all students ordered by most recently added first.
 * Requires valid JWT token in Authorization header.
 *
 * Response: Student[]
 */
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/students/:id
 *
 * Returns a single student by ID.
 * Requires valid JWT token in Authorization header.
 *
 * Params:   id — student ID (integer)
 * Response: Student | 404
 */
app.get('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * POST /api/students
 *
 * Adds a new student to the database.
 * Requires valid JWT token in Authorization header.
 * Returns 400 if email or roll_number already exists (unique constraint).
 *
 * Body:     { name: string, email: string, roll_number: string, class?: string }
 * Response: { message, student: Student }
 */
app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    const { name, email, roll_number, class: studentClass } = req.body;

    if (!name || !email || !roll_number) {
      return res.status(400).json({ message: 'Name, email, and roll number are required' });
    }

    const result = await pool.query(
      'INSERT INTO students (name, email, roll_number, class) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, roll_number, studentClass || 'N/A']
    );

    res.status(201).json({
      message: 'Student added successfully',
      student: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Email or roll number already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * DELETE /api/students/:id
 *
 * Deletes a student by ID.
 * Requires valid JWT token in Authorization header.
 * Returns the deleted student record on success.
 *
 * Params:   id — student ID (integer)
 * Response: { message, student: Student } | 404
 */
app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      message: 'Student deleted successfully',
      student: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/health
 *
 * Simple health check endpoint.
 * Used by Docker and monitoring tools to verify the server is running.
 *
 * Response: { status: 'OK', message: string }
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ERP Backend is running' });
});

/**
 * Start the Express server.
 * After binding to PORT, initializes the database (migrations + seed).
 */
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDatabase();
});
