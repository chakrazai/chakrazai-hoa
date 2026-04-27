// ─── Auth routes ─────────────────────────────────────────────────────────────
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const requireAuth = require('../middleware/auth');

// /api/auth
const authRouter = express.Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, name: `${user.first_name} ${user.last_name}` },
    });
  } catch (err) { next(err); }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [req.user.id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, name: `${u.first_name} ${u.last_name}` });
  } catch (err) { next(err); }
});

authRouter.post('/logout', requireAuth, (req, res) => res.json({ message: 'Logged out' }));

module.exports = authRouter;
