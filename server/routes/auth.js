// server/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { sendPasswordResetCodeEmail } = require('../mail');

const normalizeRussianPhone = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;

  const digits = value.replace(/\D/g, '');

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+7${digits}`;
  }

  return null;
};

const isValidEmail = (value) => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const getTokenFromHeader = (req) => req.headers.authorization?.split(' ')[1] || null;

const verifyToken = (token) => {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, jwtSecret);
};

const requireAuth = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    req.user = verifyToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.roleName)) {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }

  return next();
};

// ============================================
// ВХОД В СИСТЕМУ — с детальным логированием
// ============================================
router.post('/login', async (req, res) => {
  console.log('🔐 === POST /api/auth/login START ===');
  console.log('📥 Request headers:', req.headers);
  console.log('📥 Request body:', req.body);
  
  try {
    const { username, password } = req.body;
    
    // 1. Проверка наличия полей
    console.log('🔍 Проверка полей...');
    if (!username || !password) {
      console.log('❌ Нет логина или пароля. username:', username, 'password:', password ? '[скрыто]' : 'не указан');
      return res.status(400).json({ 
        success: false, 
        error: 'Введите логин и пароль' 
      });
    }
    console.log('✅ Поля заполнены');
    
    // 2. Поиск пользователя в базе
    console.log('🔍 Поиск пользователя в БД:', { username });
    
    const query = `
      SELECT 
        u.id, 
        u.login, 
        u.email, 
        u.phone,
        u.password_hash, 
        u.name, 
        u.role_id, 
        u.college_id,
        u.status,
        r.name as role_name,
        r.description as role_description
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.login = $1
    `;
    
    console.log('🗄️ Выполнение запроса к БД...');
    const result = await db.query(query, [username]);
    
    console.log('📊 Результат запроса:', {
      rowCount: result.rows.length,
      fields: result.fields?.map(f => f.name)
    });
    
    // 3. Проверка, найден ли пользователь
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден в БД');
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный логин или пароль' 
      });
    }
    
    const user = result.rows[0];
    console.log('✅ Пользователь найден:', {
      id: user.id,
      login: user.login,
      email: user.email,
      name: user.name,
      role_name: user.role_name,
      status: user.status,
      hasPasswordHash: !!user.password_hash,
      passwordHashStart: user.password_hash ? user.password_hash.substring(0, 20) + '...' : null
    });
    
    // 4. Проверка статуса пользователя
    if (user.status !== 'active') {
      console.log('❌ Пользователь не активен. Текущий статус:', user.status);
      return res.status(401).json({ 
        success: false, 
        error: 'Аккаунт не активен' 
      });
    }
    console.log('✅ Пользователь активен');
    
    // 5. Проверка пароля
    console.log('🔐 Проверка пароля...');
    console.log('🔐 Введённый пароль (длина):', password?.length);
    console.log('🔐 Хеш из БД (начало):', user.password_hash?.substring(0, 30) + '...');
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 bcrypt.compare результат:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Неверный пароль!');
      
      // Логируем неудачную попытку входа
      try {
        await db.query(`
          INSERT INTO login_logs (user_id, success, failure_reason, ip_address, user_agent)
          VALUES ($1, false, 'Неверный пароль', $2, $3)
        `, [user.id, req.ip, req.get('user-agent')]);
        console.log('📝 Запись в login_logs (неудача) успешна');
      } catch (logError) {
        console.error('⚠️ Ошибка при записи в login_logs:', logError);
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный логин или пароль' 
      });
    }
    console.log('✅ Пароль верный!');
    
    // 6. Создание JWT токена
    console.log('🎫 Создание JWT токена...');
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    console.log('🎫 JWT_SECRET (начало):', jwtSecret.substring(0, 20) + '...');
    
    const tokenPayload = { 
      userId: user.id, 
      login: user.login, 
      roleId: user.role_id,
      roleName: user.role_name,
      collegeId: user.college_id
    };
    console.log('🎫 Payload токена:', tokenPayload);
    
    const token = jwt.sign(
      tokenPayload,
      jwtSecret,
      { expiresIn: '24h' }
    );
    console.log('🎫 Токен создан (начало):', token.substring(0, 50) + '...');
    
    // 7. Обновление времени последнего входа
    console.log('🕐 Обновление last_login_at...');
    await db.query(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);
    console.log('✅ last_login_at обновлён');
    
    // 8. Логирование успешного входа
    console.log('📝 Запись в login_logs (успех)...');
    try {
      await db.query(`
        INSERT INTO login_logs (user_id, success, ip_address, session_id, user_agent)
        VALUES ($1, true, $2, $3, $4)
      `, [user.id, req.ip, token, req.get('user-agent')]);
      console.log('✅ Запись в login_logs успешна');
    } catch (logError) {
      console.error('⚠️ Ошибка при записи в login_logs:', logError);
    }
    
    // 9. Формирование ответа
    const responseData = {
      success: true,
      data: {
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: {
            id: user.role_id,
            name: user.role_name,
            description: user.role_description
          },
          collegeId: user.college_id
        },
        token
      }
    };
    
    console.log('✅ Ответ готов к отправке');
    console.log('🔐 === POST /api/auth/login SUCCESS ===\n');
    
    return res.json(responseData);
    
  } catch (error) {
    console.error('❌ === POST /api/auth/login ERROR ===');
    console.error('❌ Ошибка:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Name:', error.name);
    console.error('❌ Message:', error.message);
    console.error('🔐 === POST /api/auth/login END (ERROR) ===\n');
    
    return res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера: ' + error.message 
    });
  }
});

// ============================================
// ВЫХОД ИЗ СИСТЕМЫ
// ============================================
router.post('/logout', async (req, res) => {
  console.log('🚪 POST /api/auth/logout');
  
  try {
    const authHeader = req.headers.authorization;
    console.log('🔑 Authorization header:', authHeader ? '[present]' : '[missing]');
    
    const token = getTokenFromHeader(req);
    
    if (token) {
      console.log('🗑️ Деактивация сессии для токена:', token.substring(0, 20) + '...');
      
      await db.query(`
        UPDATE user_sessions 
        SET is_active = false 
        WHERE id = $1
      `, [token]);
      
      console.log('✅ Сессия деактивирована');
    } else {
      console.log('⚠️ Токен не предоставлен');
    }
    
    console.log('✅ Logout successful');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// ============================================
// ПРОВЕРКА ТОКЕНА (валидация сессии)
// ============================================
router.get('/me', async (req, res) => {
  console.log('🔍 GET /api/auth/me');
  
  try {
    const authHeader = req.headers.authorization;
    console.log('🔑 Authorization header:', authHeader ? '[present]' : '[missing]');
    
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      console.log('❌ Токен не предоставлен');
      return res.status(401).json({ success: false, error: 'Токен не предоставлен' });
    }
    
    console.log('🎫 Токен (начало):', token.substring(0, 50) + '...');
    
    // Верификация токена
    console.log('🔐 Верификация JWT...');
    const decoded = verifyToken(token);
    console.log('✅ Токен верифицирован. Decoded:', decoded);
    
    // Получение данных пользователя
    console.log('🔍 Получение данных пользователя из БД...');
    const query = `
      SELECT 
        u.id, 
        u.login, 
        u.email, 
        u.phone,
        u.name, 
        u.role_id,
        u.college_id,
        u.status,
        r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    
    const result = await db.query(query, [decoded.userId]);
    console.log('📊 Результат запроса:', { rowCount: result.rows.length });
    
    if (result.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return res.status(401).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    console.log('✅ Пользователь найден:', {
      id: user.id,
      login: user.login,
      role_name: user.role_name,
      status: user.status
    });
    
    if (user.status !== 'active') {
      console.log('❌ Пользователь не активен:', user.status);
      return res.status(401).json({ success: false, error: 'Аккаунт не активен' });
    }
    
    const responseData = {
      success: true,
      data: {
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: {
            id: user.role_id,
            name: user.role_name
          },
          collegeId: user.college_id
        }
      }
    };
    
    console.log('✅ Ответ готов');
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Auth check error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Invalid JWT');
      return res.status(401).json({ success: false, error: 'Недействительный токен' });
    }
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token expired');
      return res.status(401).json({ success: false, error: 'Срок действия токена истёк' });
    }
    
    res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
});

// ============================================
// РЕГИСТРАЦИЯ АБИТУРИЕНТА
// ============================================
router.post('/register-applicant', async (req, res) => {
  console.log('📝 === POST /api/auth/register-applicant START ===');
  
  try {
    const { name, login, email, password, phone } = req.body;
    const normalizedPhone = phone === null || phone === '' || phone === undefined
      ? null
      : normalizeRussianPhone(phone);

    // 1. Проверка наличия полей
    if (!name || !login || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Заполните все обязательные поля (имя, логин, email, пароль)'
      });
    }

    // 2. Проверка длины пароля
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Пароль должен содержать минимум 6 символов'
      });
    }

    // 3. Проверка уникальности логина и email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Введите корректный email'
      });
    }

    if (phone !== null && phone !== '' && phone !== undefined && !normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Телефон должен быть в российском формате (+7XXXXXXXXXX)'
      });
    }

    const checkQuery = `SELECT id, login, email FROM users WHERE login = $1 OR email = $2`;
    const checkResult = await db.query(checkQuery, [login, email]);

    if (checkResult.rows.length > 0) {
      const existingField = checkResult.rows[0].login === login ? 'логином' : 'email';
      return res.status(400).json({
        success: false,
        error: `Пользователь с таким ${existingField} уже существует`
      });
    }

    // 4. Получаем роль абитуриента
    const roleQuery = `SELECT id FROM roles WHERE name = 'applicant'`;
    const roleResult = await db.query(roleQuery);

    if (roleResult.rows.length === 0) {
      console.error('❌ Роль applicant не найдена в БД');
      return res.status(500).json({
        success: false,
        error: 'Ошибка конфигурации: роль абитуриента не найдена'
      });
    }

    const applicantRoleId = roleResult.rows[0].id;

    // 5. Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Создание пользователя
    const insertQuery = `
      INSERT INTO users (login, email, password_hash, name, role_id, phone, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP)
      RETURNING id, login, email, phone, name, role_id, status
    `;

    const result = await db.query(insertQuery, [
      login, email, passwordHash, name, applicantRoleId, normalizedPhone
    ]);

    const newUser = result.rows[0];

    console.log('✅ Абитуриент зарегистрирован:', {
      id: newUser.id,
      login: newUser.login,
      email: newUser.email
    });

    // 7. Создание JWT токена для автоматического входа
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: newUser.id,
        login: newUser.login,
        roleId: newUser.role_id,
        roleName: 'applicant',
        collegeId: null
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('🎫 Токен создан для абитуриента');

    res.status(201).json({
      success: true,
      message: 'Регистрация прошла успешно',
      data: {
        user: {
          id: newUser.id,
          login: newUser.login,
          email: newUser.email,
          phone: newUser.phone,
          name: newUser.name,
          role: {
            id: newUser.role_id,
            name: 'applicant'
          },
          status: newUser.status
        },
        token
      }
    });

    console.log('📝 === POST /api/auth/register-applicant SUCCESS ===\n');

  } catch (error) {
    console.error('❌ === POST /api/auth/register-applicant ERROR ===');
    console.error('❌ Ошибка:', error);
    console.error('📝 === POST /api/auth/register-applicant END (ERROR) ===\n');

    res.status(500).json({
      success: false,
      error: 'Ошибка сервера: ' + error.message
    });
  }
});

router.put('/me', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const rawPhone = req.body.phone;
    const phone = rawPhone === null || rawPhone === '' ? null : normalizeRussianPhone(rawPhone);

    if (!name) {
      return res.status(400).json({ success: false, error: 'Укажите ФИО' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Введите корректный email' });
    }

    if (rawPhone !== null && rawPhone !== '' && !phone) {
      return res.status(400).json({ success: false, error: 'Телефон должен быть в российском формате (+7XXXXXXXXXX)' });
    }

    const duplicateEmail = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1',
      [email, userId]
    );

    if (duplicateEmail.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Пользователь с таким email уже существует' });
    }

    const updateResult = await db.query(
      `
      UPDATE users
      SET name = $1, email = $2, phone = $3
      WHERE id = $4
      RETURNING id, login, email, phone, name, role_id, college_id
      `,
      [name, email, phone, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const user = updateResult.rows[0];
    const roleResult = await db.query('SELECT id, name FROM roles WHERE id = $1 LIMIT 1', [user.role_id]);
    const role = roleResult.rows[0] || { id: user.role_id, name: 'user' };

    return res.json({
      success: true,
      message: 'Данные профиля обновлены',
      data: {
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: {
            id: role.id,
            name: role.name
          },
          collegeId: user.college_id
        }
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Недействительный токен' });
    }

    console.error('PUT /api/auth/me error:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/admin/password', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Укажите текущий и новый пароль' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Новый пароль должен содержать минимум 6 символов' });
    }

    const userResult = await db.query(
      `SELECT id, password_hash FROM users WHERE id = $1 AND status = 'active' LIMIT 1`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Администратор не найден' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Текущий пароль указан неверно' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, req.user.userId]
    );

    return res.json({ success: true, message: 'Пароль администратора обновлён' });
  } catch (error) {
    console.error('POST /api/auth/admin/password error:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/password-change/request', requireAuth, requireRole(['applicant']), async (req, res) => {
  try {
    const userResult = await db.query(
      `
      SELECT id, email, name
      FROM users
      WHERE id = $1 AND status = 'active'
      LIMIT 1
      `,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);

    await db.query(
      `
      UPDATE password_reset_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND purpose = 'password_change'
        AND used_at IS NULL
      `,
      [user.id]
    );

    await db.query(
      `
      INSERT INTO password_reset_codes (user_id, code_hash, purpose, expires_at)
      VALUES ($1, $2, 'password_change', CURRENT_TIMESTAMP + INTERVAL '10 minutes')
      `,
      [user.id, codeHash]
    );

    const emailResult = await sendPasswordResetCodeEmail(user.email, user.name, code);

    return res.json({
      success: true,
      message: emailResult.success
        ? 'Код подтверждения отправлен на вашу почту'
        : 'Код создан, но email не отправлен. Проверьте настройки SMTP.',
      email_sent: emailResult.success,
      email_error: emailResult.error || null
    });
  } catch (error) {
    console.error('POST /api/auth/password-change/request error:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/password-change/confirm', requireAuth, requireRole(['applicant']), async (req, res) => {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: 'Введите 6-значный код' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Пароль должен содержать минимум 6 символов' });
    }

    const codeResult = await db.query(
      `
      SELECT id, code_hash, attempts
      FROM password_reset_codes
      WHERE user_id = $1
        AND purpose = 'password_change'
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [req.user.userId]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Код не найден или срок действия истёк' });
    }

    const resetCode = codeResult.rows[0];

    if (resetCode.attempts >= 5) {
      await db.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetCode.id]);
      return res.status(400).json({ success: false, error: 'Превышено количество попыток. Запросите новый код.' });
    }

    const isValidCode = await bcrypt.compare(code, resetCode.code_hash);
    if (!isValidCode) {
      await db.query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1', [resetCode.id]);
      return res.status(400).json({ success: false, error: 'Неверный код' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [passwordHash, req.user.userId]
      );

      await client.query(
        'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [resetCode.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return res.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('POST /api/auth/password-change/confirm error:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
