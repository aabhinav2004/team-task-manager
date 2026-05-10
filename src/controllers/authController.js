const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').toLowerCase());
}

function validateSignup({ name, email, password, accountType }) {
  const fields = {};
  if (!name || name.trim().length < 2 || name.trim().length > 50) fields.name = 'Must be 2-50 characters';
  if (!validateEmail(email)) fields.email = 'Must be a valid email';
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    fields.password = 'Min 8 chars, 1 uppercase, 1 number';
  }
  if (accountType !== undefined && !['ADMIN', 'MEMBER'].includes(accountType)) {
    fields.accountType = 'Choose admin or member';
  }
  return fields;
}

function signToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function setToken(res, user) {
  res.cookie('token', signToken(user), cookieOptions);
}

async function signup(req, res, next) {
  try {
    const fields = validateSignup(req.body);
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Validation failed', fields });

    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({
      name: req.body.name.trim(),
      email: req.body.email.trim().toLowerCase(),
      passwordHash,
      accountType: req.body.accountType === 'ADMIN' ? 'ADMIN' : 'MEMBER'
    });

    if (user.accountType === 'ADMIN') {
      await Project.create({
        name: `${user.name.split(' ')[0]}'s Workspace`,
        description: 'Your starter project. Invite members and create tasks from here.',
        color: '#6366f1',
        owner: user.id,
        members: [{ user: user.id, role: 'ADMIN' }]
      });
    }

    setToken(res, user);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const fields = {};
    if (!validateEmail(req.body.email)) fields.email = 'Must be a valid email';
    if (!req.body.password) fields.password = 'Password is required';
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Validation failed', fields });

    const user = await User.findOne({ email: req.body.email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    setToken(res, user);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Logged out' });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { signup, login, logout, me };
