const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const controller = require('../controllers/authController');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.post('/signup', authLimiter, controller.signup);
router.post('/login', authLimiter, controller.login);
router.post('/logout', auth, controller.logout);
router.get('/me', auth, controller.me);

module.exports = router;
