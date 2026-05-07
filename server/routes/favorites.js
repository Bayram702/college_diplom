const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const ENTITY_TYPES = ['college', 'specialty'];

const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' });

    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

const requireApplicant = (req, res, next) => {
  if (req.user?.roleName !== 'applicant') {
    return res.status(403).json({ success: false, error: 'Избранное доступно только абитуриентам' });
  }

  return next();
};

const parseEntity = (entityType, entityId) => {
  const normalizedType = typeof entityType === 'string' ? entityType.trim() : '';
  const parsedId = Number(entityId);

  if (!ENTITY_TYPES.includes(normalizedType)) return null;
  if (!Number.isInteger(parsedId) || parsedId <= 0) return null;

  return { entityType: normalizedType, entityId: parsedId };
};

const assertEntityExists = async (entityType, entityId) => {
  const table = entityType === 'college' ? 'colleges' : 'specialties';
  const result = await db.query(
    `SELECT 1 FROM ${table} WHERE id = $1 AND status = 'active' LIMIT 1`,
    [entityId]
  );

  return result.rows.length > 0;
};

router.get('/', requireAuth, requireApplicant, async (req, res) => {
  try {
    const userId = req.user.userId;

    const collegesResult = await db.query(
      `
      SELECT
        f.id AS favorite_id,
        f.created_at AS favorite_created_at,
        c.id,
        c.name,
        c.short_name,
        c.description,
        c.logo_image_url,
        COALESCE((
          SELECT SUM(cs.budget_places)::int
          FROM college_specialties cs
          JOIN specialties s ON s.id = cs.specialty_id
          WHERE cs.college_id = c.id
            AND cs.is_active = true
            AND s.status = 'active'
        ), 0) AS budget_places,
        COALESCE((
          SELECT SUM(cs.commercial_places)::int
          FROM college_specialties cs
          JOIN specialties s ON s.id = cs.specialty_id
          WHERE cs.college_id = c.id
            AND cs.is_active = true
            AND s.status = 'active'
        ), 0) AS commercial_places,
        (
          SELECT COUNT(*)::int
          FROM college_specialties cs
          JOIN specialties s ON s.id = cs.specialty_id
          WHERE cs.college_id = c.id
            AND cs.is_active = true
            AND s.status = 'active'
        ) AS specialties_count,
        c.avg_score,
        c.min_score,
        c.is_professionalitet,
        COALESCE((
          SELECT ROUND(AVG(cr.rating)::numeric, 1)
          FROM college_reviews cr
          WHERE cr.college_id = c.id AND cr.status = 'published'
        ), 0) AS review_average,
        (
          SELECT COUNT(*)::int
          FROM college_reviews cr
          WHERE cr.college_id = c.id AND cr.status = 'published'
        ) AS review_count,
        ci.name AS city_name
      FROM favorites f
      JOIN colleges c ON c.id = f.entity_id
      LEFT JOIN cities ci ON ci.id = c.city_id
      WHERE f.user_id = $1
        AND f.entity_type = 'college'
        AND c.status = 'active'
      ORDER BY f.created_at DESC
      `,
      [userId]
    );

    const specialtiesResult = await db.query(
      `
      SELECT
        f.id AS favorite_id,
        f.created_at AS favorite_created_at,
        s.id,
        s.code,
        s.name,
        s.description,
        s.qualification,
        s.duration,
        s.base_education,
        s.form,
        s.avg_score_last_year
      FROM favorites f
      JOIN specialties s ON s.id = f.entity_id
      WHERE f.user_id = $1
        AND f.entity_type = 'specialty'
        AND s.status = 'active'
      ORDER BY f.created_at DESC
      `,
      [userId]
    );

    return res.json({
      success: true,
      data: {
        colleges: collegesResult.rows,
        specialties: specialtiesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/status', requireAuth, requireApplicant, async (req, res) => {
  try {
    const parsed = parseEntity(req.query.entity_type, req.query.entity_id);
    if (!parsed) return res.status(400).json({ success: false, error: 'Некорректные параметры избранного' });

    const result = await db.query(
      `
      SELECT 1
      FROM favorites
      WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
      LIMIT 1
      `,
      [req.user.userId, parsed.entityType, parsed.entityId]
    );

    return res.json({ success: true, data: { isFavorite: result.rows.length > 0 } });
  } catch (error) {
    console.error('Error fetching favorite status:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/', requireAuth, requireApplicant, async (req, res) => {
  try {
    const parsed = parseEntity(req.body.entity_type, req.body.entity_id);
    if (!parsed) return res.status(400).json({ success: false, error: 'Некорректные параметры избранного' });

    const exists = await assertEntityExists(parsed.entityType, parsed.entityId);
    if (!exists) return res.status(404).json({ success: false, error: 'Объект не найден' });

    await db.query(
      `
      INSERT INTO favorites (user_id, entity_type, entity_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, entity_type, entity_id) DO NOTHING
      `,
      [req.user.userId, parsed.entityType, parsed.entityId]
    );

    return res.status(201).json({ success: true, data: { isFavorite: true } });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.delete('/:entityType/:entityId', requireAuth, requireApplicant, async (req, res) => {
  try {
    const parsed = parseEntity(req.params.entityType, req.params.entityId);
    if (!parsed) return res.status(400).json({ success: false, error: 'Некорректные параметры избранного' });

    await db.query(
      `
      DELETE FROM favorites
      WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
      `,
      [req.user.userId, parsed.entityType, parsed.entityId]
    );

    return res.json({ success: true, data: { isFavorite: false } });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
