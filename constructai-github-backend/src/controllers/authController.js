const db = require('../config/db');
const mockDb = require('../config/mockDb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_random_secret_key_12345';

exports.register = async (req, res) => {
  const { email, password, fullName, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const assignedRole = role || 'Worker'; // Default role is Worker

  try {
    // Check if user already exists
    const userExistQuery = 'SELECT id FROM users WHERE email = $1';
    const userExistCheck = await db.query(userExistQuery, [email]);
    if (userExistCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const insertQuery = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, created_at
    `;
    const result = await db.query(insertQuery, [email, passwordHash, fullName, assignedRole]);
    const newUser = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, fullName: newUser.full_name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role
      }
    });
  } catch (err) {
    console.warn('⚠️ Registration query failed. Falling back to offline mock registration:', err.message);
    
    const mockId = Date.now();
    const token = jwt.sign(
      { id: mockId, email, fullName: fullName || 'New User', role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully (Offline Simulator)!',
      token,
      user: {
        id: mockId,
        email,
        fullName: fullName || 'New User',
        role: assignedRole
      }
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Fetch user
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(userQuery, [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.warn('⚠️ Login database query failed. Falling back to offline simulator authentication:', err.message);
    
    // Check mockDb users
    const matchedUser = mockDb.users.find(u => u.email === email && (u.password === password || u.password_hash === password || (email === 'arjun@constructai.com' && password === 'password123') || (email === 'ravi@constructai.com' && password === 'password123')));
    if (matchedUser) {
      const token = jwt.sign(
        { id: matchedUser.id, email: matchedUser.email, fullName: matchedUser.fullName || matchedUser.full_name, role: matchedUser.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        message: 'Login successful (Offline Simulator)!',
        token,
        user: {
          id: matchedUser.id,
          email: matchedUser.email,
          fullName: matchedUser.fullName || matchedUser.full_name,
          role: matchedUser.role
        }
      });
    }

    // Default fallback so any password works for mock Arjun M. during live demo
    if (email === 'arjun@constructai.com') {
      const token = jwt.sign(
        { id: 11, email: 'arjun@constructai.com', fullName: 'Arjun M.', role: 'Manager' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        message: 'Login successful (Offline Simulator)!',
        token,
        user: {
          id: 11,
          email: 'arjun@constructai.com',
          fullName: 'Arjun M.',
          role: 'Manager'
        }
      });
    }

    res.status(400).json({ error: 'Invalid email or password (Offline Simulator).' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userQuery = 'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1';
    const result = await db.query(userQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.warn('⚠️ Fetch profile query failed. Returning offline mock profile from token:', err.message);
    res.json({
      user: {
        id: req.user ? req.user.id : 11,
        email: req.user ? req.user.email : 'arjun@constructai.com',
        full_name: req.user ? req.user.fullName : 'Arjun M.',
        role: req.user ? req.user.role : 'Manager'
      }
    });
  }
};

exports.getWorkers = async (req, res) => {
  try {
    // Return all workers and managers for assignable drops
    const result = await db.query('SELECT id, email, full_name, role FROM users ORDER BY full_name ASC');
    res.json({ users: result.rows });
  } catch (err) {
    console.warn('⚠️ Fetch workers query failed. Returning offline mock workers:', err.message);
    const mockUsers = [
      { id: 11, email: 'arjun@constructai.com', full_name: 'Arjun M.', role: 'Manager' },
      { id: 12, email: 'ravi@constructai.com', full_name: 'Ravi', role: 'Worker' }
    ];
    res.json({ users: mockUsers });
  }
};
