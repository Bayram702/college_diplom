const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

const normalizeSectorCode = (value) => {
  const raw = String(value || '').trim();
  const officialSectorCode = raw.match(/^\d{2}\.00\.00$/);
  if (officialSectorCode) return officialSectorCode[0];

  const specialtyCodePrefix = raw.match(/^(\d{2})\./);
  if (specialtyCodePrefix) return `${specialtyCodePrefix[1]}.00.00`;

  const numericPrefix = raw.match(/^\d{1,2}/)?.[0];
  if (numericPrefix) return `${numericPrefix.padStart(2, '0')}.00.00`;

  return '';
};

const sectorPrefixSql = (specialtyCodeExpression, sectorCodeExpression) =>
  `LEFT(${specialtyCodeExpression}, 2) = LEFT(${sectorCodeExpression}, 2)`;

const SECTOR_IMAGES = {
  '05': '/5.jpg',
  '07': '/prof.png',
  '08': '/1.jpg',
  '09': '/yarmarka.png',
  '10': '/6.png',
  '11': '/cpk.jpg',
  '12': '/ymk.jpg',
  '31': '/3.jpg',
  '35': '/5.jpg',
  '38': '/2.jpg',
  '43': '/6.png',
  '44': '/4.jpg',
  default: '/1.jpg'
};

const getSectorImageUrl = (row) => {
  if (row.image_url) return row.image_url;
  const prefix = String(row.code || '').match(/^\d{2}/)?.[0];
  return SECTOR_IMAGES[prefix] || SECTOR_IMAGES.default;
};

const syncSectorSpecialtiesByCode = async (sectorId, code) => {
  const normalizedCode = normalizeSectorCode(code);
  if (!normalizedCode) return;

  await db.query(
    `INSERT INTO specialty_sectors (specialty_id, sector_id)
     SELECT s.id, $1
     FROM specialties s
     WHERE NULLIF(s.code, '') IS NOT NULL
       AND ${sectorPrefixSql('s.code', '$2')}
     ON CONFLICT (specialty_id, sector_id) DO NOTHING`,
    [sectorId, normalizedCode]
  );
};

const sectorDedupKeySql = (alias) => `
  COALESCE(
    substring(NULLIF(${alias}.code, '') from '^\\d{2}'),
    LOWER(${alias}.name)
  )
`;

const uniqueSectorSql = (activeOnly = false) => `
  s.id = (
    SELECT MIN(s2.id)
    FROM sectors s2
    WHERE ${sectorDedupKeySql('s2')} = ${sectorDedupKeySql('s')}
      ${activeOnly ? 'AND s2.is_active = true' : ''}
  )
`;

router.get('/', async (req, res) => {
  try {
    const { include_inactive, catalog_only } = req.query;

    const params = [];
    const filters = [];

    if (!include_inactive) {
      params.push(true);
      filters.push(`s.is_active = $${params.length}`);
    }

    if (!include_inactive || catalog_only) {
      filters.push(uniqueSectorSql(!include_inactive));
    }

    if (catalog_only) {
      filters.push(`EXISTS (
        SELECT 1
        FROM spo_specialty_catalog cat
        WHERE cat.sector_code = s.code
      )`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT
        s.id,
        s.name,
        s.code,
        s.description,
        s.image_url,
        s.sort_order,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT sp.id) AS programs_count,
        COUNT(DISTINCT CASE
          WHEN cs.is_active = true AND c.status = 'active' THEN cs.college_id
          ELSE NULL
        END) AS colleges_count
      FROM sectors s
      LEFT JOIN specialties sp ON sp.status = 'active'
        AND (
          EXISTS (
            SELECT 1
            FROM specialty_sectors ss
            WHERE ss.sector_id = s.id AND ss.specialty_id = sp.id
          )
          OR (NULLIF(s.code, '') IS NOT NULL AND ${sectorPrefixSql('sp.code', 's.code')})
        )
      LEFT JOIN college_specialties cs ON cs.specialty_id = sp.id
      LEFT JOIN colleges c ON c.id = cs.college_id
      ${whereClause}
      GROUP BY s.id, s.name, s.code, s.description, s.image_url, s.sort_order, s.is_active, s.created_at, s.updated_at
      ORDER BY s.sort_order, s.name
    `;

    const result = await db.query(query, params);

    const sectors = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      image_url: getSectorImageUrl(row),
      colleges_count: Number(row.colleges_count) || 0,
      programs_count: Number(row.programs_count) || 0,
      sort_order: row.sort_order,
      is_active: row.is_active
    }));

    res.json({ success: true, data: sectors });
  } catch (error) {
    console.error('Error fetching sectors:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/catalog', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        sector_code,
        sector_name,
        specialty_code,
        specialty_name
      FROM spo_specialty_catalog
      ORDER BY sector_code, specialty_code
    `);

    const grouped = new Map();
    for (const row of result.rows) {
      if (!grouped.has(row.sector_code)) {
        grouped.set(row.sector_code, {
          code: row.sector_code,
          name: row.sector_name,
          specialties: []
        });
      }

      grouped.get(row.sector_code).specialties.push({
        code: row.specialty_code,
        name: row.specialty_name
      });
    }

    res.json({ success: true, data: Array.from(grouped.values()) });
  } catch (error) {
    console.error('Error fetching SPO catalog:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        s.id,
        s.name,
        s.code,
        s.description,
        s.image_url,
        s.sort_order,
        s.is_active,
        COUNT(DISTINCT sp.id) AS programs_count,
        COUNT(DISTINCT CASE
          WHEN cs.is_active = true AND c.status = 'active' THEN cs.college_id
          ELSE NULL
        END) AS colleges_count,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', c2.id,
                'name', c2.name,
                'short_name', c2.short_name,
                'city_name', ci.name,
                'logo_image_url', c2.logo_image_url,
                'avg_score', c2.avg_score,
                'budget_places', c2.budget_places,
                'is_professionalitet', c2.is_professionalitet
              )
              ORDER BY c2.name
            ),
            '[]'::json
          )
          FROM college_specialties cs2
          JOIN specialties sp2 ON sp2.id = cs2.specialty_id
          JOIN colleges c2 ON cs2.college_id = c2.id
          LEFT JOIN cities ci ON c2.city_id = ci.id
          LEFT JOIN specialty_sectors ss2 ON ss2.specialty_id = cs2.specialty_id
          WHERE (ss2.sector_id = s.id OR (NULLIF(s.code, '') IS NOT NULL AND ${sectorPrefixSql('sp2.code', 's.code')}))
            AND c2.status = 'active'
            AND cs2.is_active = true
        ) AS colleges
      FROM sectors s
      LEFT JOIN specialties sp ON sp.status = 'active'
        AND (
          EXISTS (
            SELECT 1
            FROM specialty_sectors ss
            WHERE ss.sector_id = s.id AND ss.specialty_id = sp.id
          )
          OR (NULLIF(s.code, '') IS NOT NULL AND ${sectorPrefixSql('sp.code', 's.code')})
        )
      LEFT JOIN college_specialties cs ON cs.specialty_id = sp.id
      LEFT JOIN colleges c ON c.id = cs.college_id
      WHERE s.id = $1
      GROUP BY s.id, s.name, s.code, s.description, s.image_url, s.sort_order, s.is_active
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Сектор не найден' });
    }

    const sector = result.rows[0];
    sector.image_url = getSectorImageUrl(sector);
    sector.colleges_count = Number(sector.colleges_count) || 0;
    sector.programs_count = Number(sector.programs_count) || 0;
    sector.colleges = sector.colleges || [];

    res.json({ success: true, data: sector });
  } catch (error) {
    console.error('Error fetching sector:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, code, description, image_url, sort_order } = req.body;
    const normalizedCode = normalizeSectorCode(code);

    if (!name || !normalizedCode) {
      return res.status(400).json({ success: false, error: 'Название и код обязательны' });
    }

    const result = await db.query(
      `INSERT INTO sectors (name, code, description, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, normalizedCode, description || '', image_url || null, sort_order || 0]
    );

    await syncSectorSpecialtiesByCode(result.rows[0].id, normalizedCode);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating sector:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, image_url, sort_order, is_active } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;
    const normalizedCode = code !== undefined ? normalizeSectorCode(code) : null;

    if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
    if (code !== undefined) {
      if (!normalizedCode) {
        return res.status(400).json({ success: false, error: 'РљРѕРґ РѕС‚СЂР°СЃР»Рё РґРѕР»Р¶РµРЅ РЅР°С‡РёРЅР°С‚СЊСЃСЏ СЃ С†РёС„СЂ' });
      }
      updates.push(`code = $${paramIndex++}`);
      params.push(normalizedCode);
    }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
    if (image_url !== undefined) { updates.push(`image_url = $${paramIndex++}`); params.push(image_url); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${paramIndex++}`); params.push(sort_order); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); params.push(is_active); }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    if (updates.length === 1) {
      return res.status(400).json({ success: false, error: 'Нет данных для обновления' });
    }

    const query = `UPDATE sectors SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Сектор не найден' });
    }

    if (normalizedCode) {
      await syncSectorSpecialtiesByCode(id, normalizedCode);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating sector:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM sectors WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Сектор не найден' });
    }

    res.json({ success: true, message: 'Сектор удалён', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting sector:', error);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
