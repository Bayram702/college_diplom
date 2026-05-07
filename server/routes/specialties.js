// server/routes/specialties.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Ваш pool подключений к БД

// Получить все специальности с отраслями
router.get('/', async (req, res) => {
  try {
    const { sector, sector_id, search, limit, page } = req.query;

    const whereClauses = [`s.status = 'active'`];
    const params = [];
    let paramIndex = 1;

    // Фильтр по отрасли
    if (sector_id) {
      whereClauses.push(`
        (
          EXISTS (
          SELECT 1
          FROM specialty_sectors ss_filter
          JOIN sectors sec_filter ON ss_filter.sector_id = sec_filter.id
          WHERE ss_filter.specialty_id = s.id
            AND ss_filter.sector_id = $${paramIndex}
          )
          OR EXISTS (
          SELECT 1
          FROM sectors sec_filter
          WHERE sec_filter.id = $${paramIndex++}
            AND NULLIF(sec_filter.code, '') IS NOT NULL
            AND LEFT(s.code, LENGTH(sec_filter.code)) = sec_filter.code
          )
        )
      `);
      params.push(sector_id);
    } else if (sector && sector !== 'all') {
      whereClauses.push(`
        (
          EXISTS (
          SELECT 1
          FROM specialty_sectors ss_filter
          JOIN sectors sec_filter ON ss_filter.sector_id = sec_filter.id
          WHERE ss_filter.specialty_id = s.id
            AND sec_filter.code = $${paramIndex++}
          )
          OR LEFT(s.code, LENGTH($${paramIndex - 1})) = $${paramIndex - 1}
        )
      `);
      params.push(sector);
    }

    // Поиск по названию или коду
    if (search) {
      whereClauses.push(`(s.name ILIKE $${paramIndex++} OR s.code ILIKE $${paramIndex++})`);
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    const whereSql = whereClauses.join(' AND ');
    let query = `
      WITH filtered AS (
        SELECT s.*
        FROM specialties s
        WHERE ${whereSql}
      ),
      canonical AS (
        SELECT DISTINCT ON (
          LOWER(TRIM(COALESCE(code, ''))),
          LOWER(TRIM(name))
        )
          *
        FROM filtered
        ORDER BY
          LOWER(TRIM(COALESCE(code, ''))),
          LOWER(TRIM(name)),
          sort_order NULLS LAST,
          id
      )
      SELECT
        c.*,
        COALESCE(
          (
            SELECT jsonb_agg(DISTINCT sector_item)
            FROM (
              SELECT jsonb_build_object('id', sec.id, 'name', sec.name, 'code', sec.code) AS sector_item
              FROM specialties s_related
              JOIN specialty_sectors ss ON s_related.id = ss.specialty_id
              JOIN sectors sec ON ss.sector_id = sec.id
              WHERE s_related.status = 'active'
                AND LOWER(TRIM(COALESCE(s_related.code, ''))) = LOWER(TRIM(COALESCE(c.code, '')))
                AND LOWER(TRIM(s_related.name)) = LOWER(TRIM(c.name))
              UNION
              SELECT jsonb_build_object('id', sec.id, 'name', sec.name, 'code', sec.code) AS sector_item
              FROM sectors sec
              WHERE NULLIF(sec.code, '') IS NOT NULL
                AND NULLIF(c.code, '') IS NOT NULL
                AND LEFT(c.code, LENGTH(sec.code)) = sec.code
            ) sector_items
          ),
          '[]'::jsonb
        ) as sectors
      FROM canonical c
      ORDER BY c.sort_order NULLS LAST, c.name
    `;

    const shouldPaginate = limit || page;
    const limitNum = parseInt(limit) || 12;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `
      SELECT COUNT(*)
      FROM (
        SELECT 1
        FROM specialties s
        WHERE ${whereSql}
        GROUP BY LOWER(TRIM(COALESCE(s.code, ''))), LOWER(TRIM(s.name))
      ) as grouped_specialties
    `;
    const countResult = shouldPaginate ? await db.query(countQuery, params) : null;

    if (shouldPaginate) {
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limitNum, offset);
    }

    const result = await db.query(query, params);
    
    // Преобразуем данные в удобный формат
    const specialties = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      qualification: row.qualification,
      duration: row.duration,
      base_education: row.base_education,
      form: row.form,
      budget_places: row.budget_places,
      commercial_places: row.commercial_places,
      price_per_year: row.price_per_year,
      exams: row.exams,
      avg_score: row.avg_score_last_year,
      // Парсим массив отраслей из JSONB
      sectors: row.sectors.map(sec => ({
        id: sec.id,
        name: sec.name,
        code: sec.code
      }))
    }));
    
    const response = { success: true, data: specialties };

    if (shouldPaginate) {
      const total = parseInt(countResult.rows[0].count);
      response.pagination = {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      };
    }

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить статистику специальностей
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(DISTINCT (LOWER(TRIM(COALESCE(code, ''))), LOWER(TRIM(name)))) FILTER (WHERE status = 'active') as total_specialties,
        COUNT(*) FILTER (WHERE is_professionalitet = true) as professionalitet_specialties,
        COALESCE(ROUND(AVG(avg_score_last_year), 2), 0) as avg_score_last_year,
        COALESCE(SUM(budget_places), 0) as total_budget_places,
        COALESCE(SUM(commercial_places), 0) as total_commercial_places
      FROM specialties
    `);

    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching specialty stats:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Получить одну специальность по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      WITH target AS (
        SELECT
          LOWER(TRIM(COALESCE(code, ''))) as specialty_code_key,
          LOWER(TRIM(name)) as specialty_name_key
        FROM specialties
        WHERE id = $1 AND status = 'active'
      ),
      related AS (
        SELECT s.*
        FROM specialties s
        JOIN target t ON
          LOWER(TRIM(COALESCE(s.code, ''))) = t.specialty_code_key
          AND LOWER(TRIM(s.name)) = t.specialty_name_key
        WHERE s.status = 'active'
      ),
      canonical AS (
        SELECT *
        FROM related
        ORDER BY sort_order NULLS LAST, id
        LIMIT 1
      )
      SELECT
        c.*,
        COALESCE(
          (
            SELECT jsonb_agg(DISTINCT sector_item)
            FROM (
              SELECT jsonb_build_object('id', sec.id, 'name', sec.name, 'code', sec.code) AS sector_item
              FROM related r
              JOIN specialty_sectors ss ON r.id = ss.specialty_id
              JOIN sectors sec ON ss.sector_id = sec.id
              UNION
              SELECT jsonb_build_object('id', sec.id, 'name', sec.name, 'code', sec.code) AS sector_item
              FROM canonical c2
              JOIN sectors sec ON NULLIF(sec.code, '') IS NOT NULL AND NULLIF(c2.code, '') IS NOT NULL AND LEFT(c2.code, LENGTH(sec.code)) = sec.code
            ) sector_items
          ),
          '[]'::jsonb
        ) as sectors,
        (
          SELECT json_agg(college_item ORDER BY college_item->>'name')
          FROM (
            SELECT DISTINCT ON (college.id)
              json_build_object(
                'id', college.id,
                'name', college.name,
                'short_name', college.short_name,
                'city_name', ci.name,
                'city_id', college.city_id,
                'budget_places', cs.budget_places,
                'commercial_places', cs.commercial_places,
                'price_per_year', cs.price_per_year,
                'avg_score', cs.avg_score,
                'is_professionalitet', college.is_professionalitet,
                'logo_image_url', college.logo_image_url,
                'phone', college.phone,
                'email', college.email,
                'website', college.website,
                'admission_url', college.admission_url
              ) as college_item
            FROM college_specialties cs
            JOIN related r ON cs.specialty_id = r.id
            JOIN colleges college ON cs.college_id = college.id
            LEFT JOIN cities ci ON college.city_id = ci.id
            WHERE cs.is_active = true
              AND college.status = 'active'
            ORDER BY college.id, cs.budget_places DESC NULLS LAST, cs.commercial_places DESC NULLS LAST
          ) grouped_colleges
        ) as colleges
      FROM canonical c
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Специальность не найдена' });
    }

    const specialty = result.rows[0];
    specialty.sectors = specialty.sectors.map(sec => ({
      id: sec.id,
      name: sec.name,
      code: sec.code
    }));
    specialty.colleges = specialty.colleges || [];

    res.json({ success: true, data: specialty });

  } catch (error) {
    console.error('Error fetching specialty:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
