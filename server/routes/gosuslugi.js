const express = require('express');
const jwt = require('jsonwebtoken');
const { getGosuslugiProfile } = require('../services/gosuslugi');

const router = express.Router();

const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

const requireApplicant = (req, res, next) => {
  if (req.user?.roleName !== 'applicant') {
    return res.status(403).json({ success: false, error: 'Доступен только кабинет абитуриента' });
  }

  return next();
};

router.get('/profile', requireAuth, requireApplicant, async (req, res) => {
  try {
    const profile = await getGosuslugiProfile({ userId: req.user.userId });
    return res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('GET /api/gosuslugi/profile error:', error);
    return res.status(500).json({ success: false, error: 'Не удалось получить данные Госуслуг' });
  }
});

module.exports = router;
