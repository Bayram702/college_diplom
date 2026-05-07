// server/routes/colleges.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Ваш pool подключений к БД

// Middleware для проверки прав админа
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (decoded.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' });
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

// Получить все колледжи с фильтрацией (публичный endpoint)
router.get('/', async (req, res) => {
  try {
    const { city, direction, professionalitet, search, minRating, limit, page } = req.query;
    
    // Базовый запрос
    const whereClauses = [`c.status = 'active'`];
    const params = [];
    let paramIndex = 1;

    let query = `
      SELECT 
        c.*,
        ci.name as city_name,
        COALESCE((
          SELECT ROUND(AVG(cr.rating)::numeric, 1)
          FROM college_reviews cr
          WHERE cr.college_id = c.id AND cr.status = 'published'
        ), 0) as review_average,
        (
          SELECT COUNT(*)::int
          FROM college_reviews cr
          WHERE cr.college_id = c.id AND cr.status = 'published'
        ) as review_count,
        (
          SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'code', s.code))
          FROM college_specialties cs
          JOIN specialties s ON cs.specialty_id = s.id
          WHERE cs.college_id = c.id AND cs.is_active = true
        ) as specialties
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      WHERE ${whereClauses[0]}
    `;
    
    // Фильтр по городу
    if (city && city !== 'all') {
      const clause = `ci.name ILIKE $${paramIndex++}`;
      whereClauses.push(clause);
      query += ` AND ${clause}`;
      params.push(`%${city}%`);
    }
    
    // Фильтр по профессионалитету
    if (professionalitet === 'yes') {
      whereClauses.push(`c.is_professionalitet = true`);
      query += ` AND c.is_professionalitet = true`;
    } else if (professionalitet === 'no') {
      whereClauses.push(`c.is_professionalitet = false`);
      query += ` AND c.is_professionalitet = false`;
    }
    
    // Поиск по названию или описанию
    if (search) {
      const clause = `(
        c.name ILIKE $${paramIndex}
        OR c.description ILIKE $${paramIndex}
        OR c.short_name ILIKE $${paramIndex}
        OR EXISTS (
          SELECT 1
          FROM college_specialties cs_search
          JOIN specialties s_search ON cs_search.specialty_id = s_search.id
          LEFT JOIN specialty_sectors ss_search ON ss_search.specialty_id = s_search.id
          LEFT JOIN sectors sec_search ON sec_search.id = ss_search.sector_id
          WHERE cs_search.college_id = c.id
            AND cs_search.is_active = true
            AND s_search.status = 'active'
            AND (
              s_search.name ILIKE $${paramIndex}
              OR s_search.code ILIKE $${paramIndex}
              OR sec_search.name ILIKE $${paramIndex}
              OR sec_search.code ILIKE $${paramIndex}
              OR EXISTS (
                SELECT 1
                FROM sectors sec_prefix
                WHERE NULLIF(sec_prefix.code, '') IS NOT NULL
                  AND LEFT(s_search.code, LENGTH(sec_prefix.code)) = sec_prefix.code
                  AND (sec_prefix.name ILIKE $${paramIndex} OR sec_prefix.code ILIKE $${paramIndex})
              )
            )
        )
      )`;
      whereClauses.push(clause);
      query += ` AND ${clause}`;
      const searchParam = `%${search}%`;
      params.push(searchParam);
      paramIndex++;
    }

    if (minRating && minRating !== 'all') {
      const parsedMinRating = Number(minRating);
      if (Number.isFinite(parsedMinRating) && parsedMinRating >= 1 && parsedMinRating <= 5) {
        const clause = `COALESCE((
          SELECT ROUND(AVG(cr_filter.rating)::numeric, 1)
          FROM college_reviews cr_filter
          WHERE cr_filter.college_id = c.id AND cr_filter.status = 'published'
        ), 0) >= $${paramIndex++}`;
        whereClauses.push(clause);
        query += ` AND ${clause}`;
        params.push(parsedMinRating);
      }
    }
    
    const filterParams = [...params];

    // Пагинация
    const limitNum = parseInt(limit) || 12;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;
    
    query += ` ORDER BY c.name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offset);
    
    const result = await db.query(query, params);
    
    // Получить общее количество для пагинации
    const countQuery = `
      SELECT COUNT(*) 
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = await db.query(countQuery, filterParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Преобразуем данные
    const colleges = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      short_name: row.short_name,
      description: row.description,
      city: row.city_name || 'Город не указан',
      cityCode: city || 'unknown',
      budget_places: row.budget_places,
      commercial_places: row.commercial_places,
      avg_score: row.avg_score,
      min_score: row.min_score,
      review_average: Number(row.review_average || 0),
      review_count: Number(row.review_count || 0),
      is_professionalitet: row.is_professionalitet,
      professionalitet_cluster: row.professionalitet_cluster,
      phone: row.phone,
      email: row.email,
      website: row.website,
      logo_image_url: row.logo_image_url,
      specialties: row.specialties || []
    }));
    
    res.json({ 
      success: true, 
      data: colleges,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить колледж текущего представителя
router.get('/my', async (req, res) => {
  try {
    console.log('🏫 GET /api/colleges/my')
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ success: false, error: 'Требуется авторизация' })

    const token = authHeader.split(' ')[1]
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    console.log('🏫 Decoded:', decoded)

    if (decoded.roleName !== 'college_rep' && decoded.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' })
    }

    if (!decoded.collegeId) {
      return res.status(404).json({ success: false, error: 'Колледж не привязан к пользователю' })
    }

    const query = `
      SELECT c.*, ci.name as city_name
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      WHERE c.id = $1 AND c.status = 'active'
    `
    const result = await db.query(query, [decoded.collegeId])
    console.log('🏫 Rows:', result.rows.length)
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Колледж не найден' })

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('❌ Error fetching my college:', error)
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message })
  }
})

// Обновить данные колледжа (представитель)
router.put('/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ success: false, error: 'Требуется авторизация' })

    const token = authHeader.split(' ')[1]
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')

    if (decoded.roleName !== 'college_rep' && decoded.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' })
    }

    const collegeId = decoded.collegeId
    if (!collegeId) return res.status(404).json({ success: false, error: 'Колледж не привязан' })

    const { name, description, phone, email, website, admission_url, status, social_vk, social_max, social_other,
            budget_places, commercial_places, avg_score, min_score, is_professionalitet, professionalitet_cluster,
            logo_image_url, opportunities, employers, workshops, professions, ovz_programs } = req.body

    const updates = []
    const params = []
    let idx = 1

    const fields = {
      name, description, phone, email, website, admission_url, status, social_vk, social_max, social_other,
      budget_places, commercial_places, avg_score, min_score, is_professionalitet, professionalitet_cluster,
      logo_image_url, opportunities, employers, workshops, professions, ovz_programs
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        if (key === 'is_professionalitet') {
          updates.push(`${key} = $${idx}`)
          params.push(value === 'yes' || value === true)
        } else if (Array.isArray(value) || typeof value === 'object') {
          updates.push(`${key} = $${idx}`)
          params.push(JSON.stringify(value))
        } else {
          updates.push(`${key} = $${idx}`)
          params.push(value)
        }
        idx++
      }
    }

    if (updates.length === 0) return res.status(400).json({ success: false, error: 'Нет данных для обновления' })

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(collegeId)

    const query = `UPDATE colleges SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`
    const result = await db.query(query, params)

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Колледж не найден' })

    res.json({ success: true, data: result.rows[0], message: 'Данные колледжа обновлены' })
  } catch (error) {
    console.error('Error updating college:', error)
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message })
  }
})

// Получить колледжи для карты (координаты)
router.get('/map', async (req, res) => {
  try {
    console.log('🗺️ GET /api/colleges/map - запрос');
    const query = `
      SELECT
        c.id,
        c.name,
        c.short_name,
        c.logo_image_url,
        ci.name as city_name,
        ca.coordinates,
        ca.address,
        ca.phone,
        ca.name as ca_address_name,
        ca.is_main
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      LEFT JOIN college_addresses ca ON c.id = ca.college_id
      WHERE c.status = 'active' AND ca.coordinates IS NOT NULL
      ORDER BY c.name, ca.is_main DESC
    `;

    console.log('📝 Выполняется запрос:', query);
    const result = await db.query(query);
    console.log('✅ Результат:', result.rows.length, 'строк');

    // Группируем адреса по колледжам
    const collegesMap = new Map();

    result.rows.forEach(row => {
      if (!collegesMap.has(row.id)) {
        collegesMap.set(row.id, {
          id: row.id,
          name: row.name,
          short_name: row.short_name,
          city: row.city_name || 'Город не указан',
          addresses: [],
          logo_image_url: row.logo_image_url
        });
      }

      if (row.coordinates) {
        collegesMap.get(row.id).addresses.push({
          coordinates: row.coordinates,
          address: row.address || '',
          phone: row.phone || '',
          address_name: row.ca_address_name || '',
          is_main: row.is_main || false
        });
      }
    });

    const colleges = Array.from(collegesMap.values());

    console.log('📤 Отправляю', colleges.length, 'колледжей');
    res.json({ success: true, data: colleges });
  } catch (error) {
    console.error('❌ Error fetching colleges for map:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Message:', error.message);
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

// Статистика колледжей (публичная)
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_colleges,
        COUNT(*) FILTER (WHERE is_professionalitet = true) as professionalitet_colleges,
        COALESCE(SUM(budget_places), 0) as total_budget_places,
        COALESCE(SUM(commercial_places), 0) as total_commercial_places,
        COALESCE(ROUND(AVG(avg_score), 1), 0) as avg_score
      FROM colleges
    `);

    const specialtiesStats = await db.query(`
      SELECT
        COUNT(DISTINCT (LOWER(TRIM(COALESCE(code, ''))), LOWER(TRIM(name)))) FILTER (WHERE status = 'active') as total_specialties,
        COALESCE(ROUND(AVG(avg_score_last_year), 2), 0) as avg_score_last_year
      FROM specialties
    `);

    res.json({
      success: true,
      data: {
        colleges: stats.rows[0],
        specialties: specialtiesStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить один колледж по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.*,
        ci.name as city_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'code', s.code,
              'name', s.name,
              'description', s.description,
              'qualification', s.qualification,
              'duration', s.duration,
              'base_education', s.base_education,
              'form', s.form,
              'exams', s.exams,
              'avg_score_last_year', s.avg_score_last_year,
              'budget_places', cs.budget_places,
              'commercial_places', cs.commercial_places,
              'price_per_year', cs.price_per_year,
              'avg_score', cs.avg_score
            )
            ORDER BY s.sort_order, s.name
          )
          FROM college_specialties cs
          JOIN specialties s ON cs.specialty_id = s.id
          WHERE cs.college_id = c.id AND cs.is_active = true AND s.status = 'active'
        ) as specialties,
        (
          SELECT json_agg(
            json_build_object(
              'id', ca.id,
              'name', ca.name,
              'address', ca.address,
              'phone', ca.phone,
              'email', ca.email,
              'coordinates', ca.coordinates,
              'is_main', ca.is_main
            )
            ORDER BY ca.is_main DESC, ca.sort_order
          )
          FROM college_addresses ca
          WHERE ca.college_id = c.id AND ca.coordinates IS NOT NULL
        ) as campuses
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      WHERE c.id = $1 AND c.status = 'active'
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Колледж не найден' });
    }

    const college = result.rows[0];
    college.specialties = college.specialties || [];
    college.campuses = college.campuses || [];

    res.json({ success: true, data: college });

  } catch (error) {
    console.error('Error fetching college:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить специальности конкретного колледжа
router.get('/:id/specialties', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        s.id,
        s.code,
        s.name,
        s.description,
        s.qualification,
        s.duration,
        s.base_education,
        s.form,
        cs.budget_places,
        cs.commercial_places,
        cs.price_per_year,
        cs.avg_score,
        cs.is_active,
        (
          SELECT json_agg(
            json_build_object('id', sec.id, 'name', sec.name, 'code', sec.code)
            ORDER BY sec.name
          ) FILTER (WHERE sec.id IS NOT NULL)
          FROM specialty_sectors ss
          JOIN sectors sec ON ss.sector_id = sec.id
          WHERE ss.specialty_id = s.id
        ) as sectors
      FROM college_specialties cs
      JOIN specialties s ON cs.specialty_id = s.id
      WHERE cs.college_id = $1 AND cs.is_active = true AND s.status = 'active'
      ORDER BY s.sort_order, s.name
    `;

    const result = await db.query(query, [id]);

    const specialties = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      qualification: row.qualification,
      duration: row.duration,
      base_education: row.base_education === '9' ? '9 классов' : '11 классов',
      form: row.form === 'full-time' ? 'Очная' : row.form === 'part-time' ? 'Заочная' : 'Дистанционная',
      budget_places: row.budget_places || 0,
      commercial_places: row.commercial_places || 0,
      price_per_year: row.price_per_year || 0,
      avg_score: row.avg_score,
      is_active: row.is_active,
      sectors: row.sectors || []
    }));

    res.json({ success: true, data: specialties });
  } catch (error) {
    console.error('Error fetching college specialties:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить все колледжи с представителями (для админ-панели)
router.get('/admin/list', requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT
        c.id,
        c.name,
        c.short_name,
        c.status,
        c.is_professionalitet,
        c.professionalitet_cluster,
        c.created_at,
        c.updated_at,
        ci.name as city_name,
        u.id as rep_id,
        u.name as rep_name,
        u.login as rep_login,
        u.email as rep_email,
        u.status as rep_status,
        u.last_login_at as rep_last_login
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      LEFT JOIN users u ON u.college_id = c.id AND u.role_id = (SELECT id FROM roles WHERE name = 'college_rep')
      WHERE c.status != 'deleted'
      ORDER BY c.name
    `;

    const result = await db.query(query);

    // Группируем колледжи
    const collegesMap = new Map();

    result.rows.forEach(row => {
      if (!collegesMap.has(row.id)) {
        collegesMap.set(row.id, {
          id: row.id,
          name: row.name,
          short_name: row.short_name,
          status: row.status,
          is_professionalitet: row.is_professionalitet,
          professionalitet_cluster: row.professionalitet_cluster,
          city: row.city_name || 'Не указан',
          created_at: row.created_at,
          updated_at: row.updated_at,
          representatives: []
        });
      }

      if (row.rep_id) {
        collegesMap.get(row.id).representatives.push({
          id: row.rep_id,
          name: row.rep_name,
          login: row.rep_login,
          email: row.rep_email,
          status: row.rep_status,
          last_login: row.rep_last_login
        });
      }
    });

    const colleges = Array.from(collegesMap.values());

    res.json({
      success: true,
      data: colleges,
      total: colleges.length
    });

  } catch (error) {
    console.error('❌ Error fetching colleges for admin:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

// ===== ADMIN ENDPOINTS =====

// Получить все колледжи с фильтрами (admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, city, status, page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT 
        c.*,
        ci.name as city_name,
        (SELECT COUNT(*) FROM college_specialties cs WHERE cs.college_id = c.id AND cs.is_active = true) as specialties_count,
        (SELECT COUNT(*) FROM users u WHERE u.college_id = c.id AND u.status = 'active') as active_reps_count
      FROM colleges c
      LEFT JOIN cities ci ON c.city_id = ci.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }
    
    if (city && city !== 'all') {
      query += ` AND ci.name ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }
    
    if (status && status !== 'all') {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    const limitNum = parseInt(limit) || 10;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;
    
    const countQuery = query.replace('SELECT c.*, ci.name as city_name', 'SELECT COUNT(*)').replace(', (SELECT COUNT(*) FROM college_specialties cs WHERE cs.college_id = c.id AND cs.is_active = true) as specialties_count, (SELECT COUNT(*) FROM users u WHERE u.college_id = c.id AND u.status = \'active\') as active_reps_count', '');
    const countResult = await db.query(countQuery, params.slice(0, paramIndex - 2));
    const total = parseInt(countResult.rows[0].count);
    
    query += ` ORDER BY c.name LIMIT $${paramIndex} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);
    
    const result = await db.query(query, params);
    
    const colleges = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      city: row.city_name,
      cityId: row.city_id,
      description: row.description,
      status: row.status,
      isProfessionalitet: row.is_professionalitet,
      budgetPlaces: row.budget_places,
      commercialPlaces: row.commercial_places,
      avgScore: row.avg_score,
      specialtiesCount: row.specialties_count,
      activeRepsCount: row.active_reps_count,
      contacts: {
        phone: row.phone,
        email: row.email,
        website: row.website
      },
      createdAt: row.created_at
    }));
    
    res.json({
      success: true,
      data: colleges,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching colleges:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Создать колледж
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, shortName, city, description, phone, email, website } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Название колледжа обязательно' });
    }
    
    // Получаем или создаём город
    let cityId = null;
    if (city) {
      const cityQuery = `SELECT id FROM cities WHERE name ILIKE $1 LIMIT 1`;
      const cityResult = await db.query(cityQuery, [city]);
      
      if (cityResult.rows.length > 0) {
        cityId = cityResult.rows[0].id;
      } else {
        const newCity = await db.query(
          `INSERT INTO cities (name, region) VALUES ($1, 'Республика Башкортостан') RETURNING id`,
          [city]
        );
        cityId = newCity.rows[0].id;
      }
    }
    
    const result = await db.query(`
      INSERT INTO colleges (
        name, short_name, city_id, description, 
        phone, email, website, status,
        created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $8)
      RETURNING id, name, short_name, city_id, description, status
    `, [
      name, shortName || null, cityId, description || '',
      phone || null, email || null, website || null, req.user?.id || 1
    ]);
    
    const newCollege = result.rows[0];
    
    // Аудит
    await db.query(`
      INSERT INTO audit_logs (entity_type, entity_id, entity_name, user_id, action, changes, ip_address)
      VALUES ('college', $1, $2, $3, 'create', $4, $5)
    `, [newCollege.id, newCollege.name, req.user?.id || 1, JSON.stringify(req.body), req.ip]);
    
    res.status(201).json({
      success: true,
      message: 'Колледж успешно создан',
      data: newCollege
    });
    
  } catch (error) {
    console.error('Error creating college:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

// Обновить колледж
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortName, city, description, phone, email, website, status } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
    if (shortName !== undefined) { updates.push(`short_name = $${paramIndex++}`); params.push(shortName); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
    if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); params.push(phone); }
    if (email !== undefined) { updates.push(`email = $${paramIndex++}`); params.push(email); }
    if (website !== undefined) { updates.push(`website = $${paramIndex++}`); params.push(website); }
    if (status) { updates.push(`status = $${paramIndex++}`); params.push(status); }
    
    if (city) {
      const cityQuery = `SELECT id FROM cities WHERE name ILIKE $1 LIMIT 1`;
      const cityResult = await db.query(cityQuery, [city]);
      let cityId = cityResult.rows[0]?.id;
      
      if (!cityId) {
        const newCity = await db.query(
          `INSERT INTO cities (name, region) VALUES ($1, 'Республика Башкортостан') RETURNING id`,
          [city]
        );
        cityId = newCity.rows[0].id;
      }
      
      updates.push(`city_id = $${paramIndex++}`);
      params.push(cityId);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length === 1) {
      return res.status(400).json({ success: false, error: 'Нет данных для обновления' });
    }
    
    params.push(id);
    
    const query = `UPDATE colleges SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, short_name, status`;
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Колледж не найден' });
    }
    
    // Аудит
    await db.query(`
      INSERT INTO audit_logs (entity_type, entity_id, entity_name, user_id, action, changes, ip_address)
      VALUES ('college', $1, $2, $3, 'update', $4, $5)
    `, [id, result.rows[0].name, req.user?.id || 1, JSON.stringify(req.body), req.ip]);
    
    res.json({ success: true, data: result.rows[0] });
    
  } catch (error) {
    console.error('Error updating college:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Статистика колледжей
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN is_professionalitet = true THEN 1 END) as professionalitet,
        AVG(budget_places) as avg_budget,
        AVG(commercial_places) as avg_commercial
      FROM colleges
    `);
    
    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching college stats:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
