/**
 * App.js — ERP Frontend Root Component
 *
 * Single-page React application for the dummy ERP system.
 * Handles two views:
 *   1. Login page  — shown when no JWT token is in localStorage
 *   2. Dashboard   — shown after login, lists students and allows add/delete
 *
 * API calls go to /api/* which nginx proxies to the backend container.
 * The JWT token is stored in localStorage and sent as a Bearer token on every request.
 * If the server returns 401 or 403, the user is automatically logged out.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

/**
 * Base URL for all API calls.
 * Defaults to /api so nginx can proxy it to the backend.
 * Can be overridden via REACT_APP_API_URL env var during build.
 */
const API_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * App
 *
 * Root component. Manages auth state and student data.
 * Renders either the Login form or the Dashboard depending on token presence.
 *
 * State:
 *   token       — JWT token from localStorage, null if not logged in
 *   user        — logged in user object { id, username }
 *   students    — array of student records from the API
 *   loading     — true while any API call is in flight
 *   error       — error message string to display, empty string if none
 *   username    — controlled input for login form
 *   password    — controlled input for login form
 *   studentForm — controlled inputs for add student form
 */
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentForm, setStudentForm] = useState({ name: '', email: '', roll_number: '', class: '' });

  /**
   * Fetch students whenever the token changes (i.e. on login).
   * Also runs on first render if a token is already in localStorage.
   */
  useEffect(() => {
    if (token) {
      fetchStudents();
    }
  }, [token]);

  /**
   * fetchStudents
   *
   * Loads all students from GET /api/students.
   * Automatically logs out if the token is expired or invalid (401/403).
   */
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch students');
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleLogin
   *
   * Submits username/password to POST /api/auth/login.
   * Saves the returned JWT token to localStorage and state on success.
   *
   * @param {React.FormEvent} e
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleAddStudent
   *
   * Submits the student form to POST /api/students.
   * Clears the form and refreshes the student list on success.
   *
   * @param {React.FormEvent} e
   */
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await axios.post(`${API_URL}/students`, studentForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentForm({ name: '', email: '', roll_number: '', class: '' });
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleDeleteStudent
   *
   * Asks for confirmation then sends DELETE /api/students/:id.
   * Refreshes the student list after successful deletion.
   *
   * @param {number} id — student ID to delete
   */
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    try {
      setLoading(true);
      setError('');
      await axios.delete(`${API_URL}/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setLoading(false);
    }
  };

  /**
   * logout
   *
   * Clears the JWT token from localStorage and resets all auth/data state.
   * Returns the user to the login page.
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setStudents([]);
  };

  /* ── Login Page ── rendered when no token is present */
  if (!token) {
    return (
      <div className="app">
        <div className="login-container">
          <h1>ERP System Login</h1>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="hint">Default: admin / admin123</p>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── rendered after successful login */
  return (
    <div className="app">
      <header>
        <h1>ERP Dashboard</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <main>
        {error && <div className="error">{error}</div>}

        {/* Add Student Form */}
        <section className="form-section">
          <h2>Add Student</h2>
          <form onSubmit={handleAddStudent} className="student-form">
            <input
              type="text"
              placeholder="Name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Roll Number"
              value={studentForm.roll_number}
              onChange={(e) => setStudentForm({ ...studentForm, roll_number: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Class"
              value={studentForm.class}
              onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </form>
        </section>

        {/* Students List */}
        <section className="list-section">
          <h2>Students ({students.length})</h2>
          {loading && students.length === 0 ? (
            <p>Loading...</p>
          ) : students.length === 0 ? (
            <p>No students found. Add one above!</p>
          ) : (
            <table className="students-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roll No</th>
                  <th>Class</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>{student.roll_number}</td>
                    <td>{student.class}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="delete-btn"
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
