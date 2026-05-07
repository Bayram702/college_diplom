// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendRepresentativePasswordChangedEmail } = require('../mail');

// Middleware для проверки прав админа
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    console.log('🔑 requireAdmin: Authorization header:', authHeader ? '[present]' : '[missing]')
    
    if (!authHeader) {
      console.log('❌ Нет заголовка Authorization')
      return res.status(401).json({ success: false, error: 'Требуется авторизация' })
    }
    
    const token = authHeader.split(' ')[1]
    console.log('🎫 Токен (начало):', token ? token.substring(0, 30) + '...' : 'null')
    
    if (!token) {
      console.log('❌ Токен не найден в заголовке')
      return res.status(401).json({ success: false, error: 'Требуется авторизация' })
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    console.log('🔐 JWT_SECRET (начало):', jwtSecret.substring(0, 20) + '...')
    
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, jwtSecret)
    console.log('✅ Токен верифицирован:', decoded)

    if (decoded.roleName !== 'admin') {
      console.log('❌ Недостаточно прав. roleName:', decoded.roleName)
      return res.status(403).json({ success: false, error: 'Доступ запрещён' })
    }

    req.user = decoded
    console.log('✅ Доступ разрешён')
    next()
  } catch (error) {
    console.error('❌ Ошибка верификации токена:', error.name, error.message)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Сессия истекла' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Недействительный токен' })
    }
    res.status(401).json({ success: false, error: 'Недействительный токен' })
  }
}

const normalizeId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const getCollegeRepRoleId = async () => {
  const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['college_rep'])
  return roleRes.rows[0]?.id || null
}

const ensureCollegeCanReceiveRep = async (collegeId, currentUserId = null) => {
  const normalizedCollegeId = normalizeId(collegeId)
  if (!normalizedCollegeId) {
    return { ok: false, status: 400, error: 'Выберите колледж для представителя' }
  }

  const collegeRes = await db.query(
    `SELECT id FROM colleges WHERE id = $1 AND status != 'deleted' LIMIT 1`,
    [normalizedCollegeId]
  )

  if (collegeRes.rows.length === 0) {
    return { ok: false, status: 404, error: 'Колледж не найден' }
  }

  const params = [normalizedCollegeId]
  let currentUserClause = ''

  if (currentUserId) {
    params.push(currentUserId)
    currentUserClause = `AND u.id <> $2`
  }

  const repRes = await db.query(
    `SELECT u.id, u.name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.college_id = $1
       AND r.name = 'college_rep'
       AND u.status = 'active'
       ${currentUserClause}
     LIMIT 1`,
    params
  )

  if (repRes.rows.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `У выбранного колледжа уже есть активный представитель: ${repRes.rows[0].name}`
    }
  }

  return { ok: true, collegeId: normalizedCollegeId }
}

// Получить всех пользователей (кроме админов, если нужно)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { excludeAdmin, search, role, status, page = 1, limit = 10 } = req.query;

    // Если запрошены ВСЕ пользователи без фильтрации (захардкоженный режим)
    const getAll = req.query.all === 'true';

    const conditions = [`r.name = 'college_rep'`];
    const params = [];
    let paramIndex = 1;

    // Исключить админов (только если не запрошены все)
    if (!getAll && excludeAdmin === 'true') {
      conditions.push(`r.name != 'admin'`);
    }

    // Поиск
    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.login ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Фильтр по роли
    if (role && role !== 'all') {
      conditions.push(`r.name = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    // Фильтр по статусу
    if (status && status !== 'all') {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Получение общего количества
    const countQuery = `
      SELECT COUNT(*)
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
    `;

    console.log('📊 Count query:', countQuery);
    console.log('📊 Count params:', params);
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    console.log('📊 Total users:', total);

    // Пагинация
    const limitNum = getAll ? 1000 : (parseInt(limit) || 10);
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    // Основной запрос
    const dataQuery = `
      SELECT
        u.id, u.login, u.email, u.name, u.status, u.created_at, u.last_login_at,
        r.name as role_name, r.description as role_description,
        c.name as college_name, c.id as college_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN colleges c ON u.college_id = c.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const queryParams = [...params, limitNum, offset];
    console.log('📊 Data query:', dataQuery);
    console.log('📊 Data params:', queryParams);

    const result = await db.query(dataQuery, queryParams);
    console.log('📊 Rows returned:', result.rows.length);

    const users = result.rows.map(row => ({
      id: row.id,
      login: row.login,
      email: row.email,
      name: row.name,
      status: row.status,
      role: {
        name: row.role_name,
        description: row.role_description
      },
      college: row.college_id ? {
        id: row.college_id,
        name: row.college_name
      } : null,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at
    }));

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

// Создать представителя колледжа
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, login, email, password, college_id } = req.body

    if (!name || !login || !email || !password) {
      return res.status(400).json({ success: false, error: 'Заполните все обязательные поля' })
    }

    const collegeCheck = await ensureCollegeCanReceiveRep(college_id)
    if (!collegeCheck.ok) {
      return res.status(collegeCheck.status).json({ success: false, error: collegeCheck.error })
    }

    // Проверка уникальности
    const checkRes = await db.query('SELECT id FROM users WHERE login = $1 OR email = $2', [login, email])
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Пользователь с таким логином или email уже существует' })
    }

    const collegeRepRoleId = await getCollegeRepRoleId()
    if (!collegeRepRoleId) return res.status(400).json({ success: false, error: 'Роль представителя колледжа не найдена' })

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.query(
      `INSERT INTO users (login, email, password_hash, name, role_id, college_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, login, email, name, status`,
      [login, email, passwordHash, name, collegeRepRoleId, collegeCheck.collegeId, 'active']
    )

    const newUser = result.rows[0]

    // Отправляем email с данными для входа
    const { sendCredentialsEmail } = require('../mail')
    const emailResult = await sendCredentialsEmail(email, name, login, password)

    res.status(201).json({
      success: true,
      message: 'Пользователь создан',
      data: newUser,
      email_sent: emailResult.success,
      email_error: emailResult.error || null,
      // Если email не отправлен, показываем данные админу
      credentials: emailResult.success ? null : { login, password }
    })
  } catch (e) {
    console.error('Error creating user:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

// Создать пользователя (представителя колледжа)
router.post('/college-rep', requireAdmin, async (req, res) => {
  try {
    const { 
      collegeName, 
      collegeCity, 
      collegeDescription,
      repLogin, 
      repEmail, 
      repPassword, 
      repName 
    } = req.body;
    
    // Валидация
    if (!collegeName || !repLogin || !repEmail || !repPassword || !repName) {
      return res.status(400).json({ success: false, error: 'Все обязательные поля должны быть заполнены' });
    }
    
    // Проверка уникальности логина и email
    const checkQuery = `SELECT id FROM users WHERE login = $1 OR email = $2`;
    const checkResult = await db.query(checkQuery, [repLogin, repEmail]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Пользователь с таким логином или email уже существует' });
    }
    
    // Хеширование пароля
    const passwordHash = await bcrypt.hash(repPassword, 10);
    
    // Получаем ID роли представителя колледжа
    const roleQuery = `SELECT id FROM roles WHERE name = 'college_rep'`;
    const roleResult = await db.query(roleQuery);
    const collegeRepRoleId = roleResult.rows[0].id;
    
    // Начинаем транзакцию
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Создаём колледж
      const collegeInsert = `
        INSERT INTO colleges (
          name, city_id, description, status, 
          created_by, updated_by
        ) VALUES ($1, $2, $3, 'active', $4, $4)
        RETURNING id
      `;
      
      // Получаем city_id по названию города или создаём новый
      let cityId = null;
      if (collegeCity) {
        const cityQuery = `SELECT id FROM cities WHERE name ILIKE $1 LIMIT 1`;
        const cityResult = await client.query(cityQuery, [collegeCity]);
        
        if (cityResult.rows.length > 0) {
          cityId = cityResult.rows[0].id;
        } else {
          const cityInsert = `INSERT INTO cities (name, region) VALUES ($1, 'Республика Башкортостан') RETURNING id`;
          const newCity = await client.query(cityInsert, [collegeCity]);
          cityId = newCity.rows[0].id;
        }
      }
      
      const collegeResult = await client.query(collegeInsert, [
        collegeName, cityId, collegeDescription || '', 1 // 1 = ID админа по умолчанию
      ]);
      const collegeId = collegeResult.rows[0].id;
      
      // 2. Создаём пользователя-представителя
      const userInsert = `
        INSERT INTO users (
          login, email, password_hash, name, 
          role_id, college_id, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
        RETURNING id, login, email, name
      `;
      
      const userResult = await client.query(userInsert, [
        repLogin, repEmail, passwordHash, repName, 
        collegeRepRoleId, collegeId, 1
      ]);
      
      await client.query('COMMIT');
      
      const newUser = userResult.rows[0];
      
      // Логируем действие в аудит
      await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, entity_name, user_id, action, changes, ip_address)
        VALUES ('college', $1, $2, $3, 'create', $4, $5)
      `, [collegeId, collegeName, 1, JSON.stringify({ collegeName, collegeCity }), req.ip]);
      
      res.status(201).json({
        success: true,
        message: 'Колледж и представитель успешно созданы',
        data: {
          college: { id: collegeId, name: collegeName },
          user: { id: newUser.id, login: newUser.login, email: newUser.email, name: newUser.name }
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating college rep:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

// Обновить представителя колледжа
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = normalizeId(id)
    const { name, login, email, password, status } = req.body;
    const newPlainPassword = typeof password === 'string' ? password.trim() : ''
    const collegeId = req.body.college_id ?? req.body.collegeId

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный ID пользователя' })
    }

    const existingRes = await db.query(
      `SELECT u.id, u.college_id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND r.name = 'college_rep'
       LIMIT 1`,
      [userId]
    )

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Представитель колледжа не найден' })
    }

    if (status && !['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Некорректный статус' })
    }

    if (login || email) {
      const uniqueRes = await db.query(
        `SELECT id FROM users WHERE (login = $1 OR email = $2) AND id <> $3 LIMIT 1`,
        [login || '', email || '', userId]
      )

      if (uniqueRes.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Пользователь с таким логином или email уже существует' })
      }
    }

    if (collegeId !== undefined) {
      const collegeCheck = await ensureCollegeCanReceiveRep(collegeId, userId)
      if (!collegeCheck.ok) {
        return res.status(collegeCheck.status).json({ success: false, error: collegeCheck.error })
      }
    } else if (status === 'active') {
      const collegeCheck = await ensureCollegeCanReceiveRep(existingRes.rows[0].college_id, userId)
      if (!collegeCheck.ok) {
        return res.status(collegeCheck.status).json({ success: false, error: collegeCheck.error })
      }
    }
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }

    if (login !== undefined) {
      updates.push(`login = $${paramIndex++}`);
      params.push(login);
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }

    if (newPlainPassword) {
      updates.push(`password_hash = $${paramIndex++}`);
      params.push(await bcrypt.hash(newPlainPassword, 10));
    }

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (collegeId !== undefined) {
      updates.push(`college_id = $${paramIndex++}`);
      params.push(normalizeId(collegeId));
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length === 1) {
      return res.status(400).json({ success: false, error: 'Нет данных для обновления' });
    }
    
    params.push(userId);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, login, email, name, status, college_id`;
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Аудит
    let passwordEmailResult = null
    if (newPlainPassword) {
      passwordEmailResult = await sendRepresentativePasswordChangedEmail(
        result.rows[0].email,
        result.rows[0].name,
        result.rows[0].login,
        newPlainPassword
      )
    }

    await db.query(`
      INSERT INTO audit_logs (entity_type, entity_id, entity_name, user_id, action, changes, ip_address)
      VALUES ('user', $1, $2, $3, 'update', $4, $5)
    `, [userId, result.rows[0].name, req.user?.userId || 1, JSON.stringify({ name, login, email, status, collegeId }), req.ip]);
    
    res.json({
      success: true,
      data: result.rows[0],
      password_email_sent: passwordEmailResult ? passwordEmailResult.success : null,
      password_email_error: passwordEmailResult?.error || null,
      credentials: passwordEmailResult && !passwordEmailResult.success
        ? { login: result.rows[0].login, password: newPlainPassword }
        : null
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Удалить пользователя (мягкое удаление через статус)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка, не удаляет ли админ сам себя
    if (req.user?.userId === parseInt(id)) {
      return res.status(400).json({ success: false, error: 'Нельзя удалить самого себя' });
    }
    
    // Меняем статус на 'inactive' вместо физического удаления
    const result = await db.query(
      `UPDATE users u
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       FROM roles r
       WHERE u.id = $1
         AND u.role_id = r.id
         AND r.name = 'college_rep'
         AND u.status != 'deleted'
       RETURNING u.id, u.login, u.name`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Представитель колледжа не найден' });
    }
    
    // Аудит
    await db.query(`
      INSERT INTO audit_logs (entity_type, entity_id, entity_name, user_id, action, ip_address)
      VALUES ('user', $1, $2, $3, 'delete', $4)
    `, [id, result.rows[0].name, req.user?.id || 1, req.ip]);
    
    res.json({ success: true, message: 'Пользователь деактивирован', data: result.rows[0] });
    
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить статистику пользователей
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
        COUNT(CASE WHEN r.name = 'college_rep' THEN 1 END) as college_reps
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name != 'admin'
    `);
    
    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
