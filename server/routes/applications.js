const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const MAX_APPLICATIONS_PER_APPLICANT = 5;
const ALLOWED_APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'cancelled'];
const ALLOWED_DECISION_STATUSES = ['accepted', 'rejected'];

const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
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

const normalizeRussianPhone = (value) => {
  if (typeof value !== 'string') return null;

  const digits = value.replace(/\D/g, '');
  let normalized = null;

  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    normalized = `+7${digits.slice(1)}`;
  } else if (digits.length === 10) {
    normalized = `+7${digits}`;
  }

  if (!normalized || !/^\+7\d{10}$/.test(normalized)) {
    return null;
  }

  return normalized;
};

const isValidEmail = (value) => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const parseAvgScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  if (score < 2 || score > 5) return null;

  const scaled = Math.round(score * 100);
  if (Math.abs(score * 100 - scaled) > 1e-8) return null;

  return Number((scaled / 100).toFixed(2));
};

// Create application (applicant only)
router.post('/', requireAuth, requireRole(['applicant']), async (req, res) => {
  const {
    college_id,
    specialty_id,
    avg_score,
    applicant_name,
    phone,
    email,
    needs_dormitory
  } = req.body;

  const collegeId = Number(college_id);
  const specialtyId = Number(specialty_id);
  const parsedAvgScore = parseAvgScore(avg_score);
  const applicantName = typeof applicant_name === 'string' ? applicant_name.trim() : '';
  const normalizedPhone = normalizeRussianPhone(phone);
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  const parsedNeedsDormitory =
    typeof needs_dormitory === 'boolean'
      ? needs_dormitory
      : (needs_dormitory === 'true' ? true : (needs_dormitory === 'false' ? false : null));

  if (!Number.isInteger(collegeId) || collegeId <= 0) {
    return res.status(400).json({ success: false, error: 'Некорректный колледж' });
  }

  if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
    return res.status(400).json({ success: false, error: 'Некорректная специальность' });
  }

  if (!applicantName) {
    return res.status(400).json({ success: false, error: 'Укажите имя абитуриента' });
  }

  if (!normalizedPhone) {
    return res.status(400).json({
      success: false,
      error: 'Телефон должен быть в российском формате (+7XXXXXXXXXX)'
    });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ success: false, error: 'Некорректный email' });
  }

  if (parsedAvgScore === null) {
    return res.status(400).json({
      success: false,
      error: 'Средний балл должен быть в диапазоне от 2.00 до 5.00 с шагом 0.01'
    });
  }

  if (parsedNeedsDormitory === null) {
    return res.status(400).json({ success: false, error: 'Поле общежития должно быть boolean' });
  }

  const applicantId = req.user.userId;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock applicant row to reduce race conditions on 5-applications limit.
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [applicantId]);

    const limitResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM applications
       WHERE applicant_id = $1
         AND status != 'cancelled'`,
      [applicantId]
    );
    const currentCount = limitResult.rows[0]?.count || 0;

    if (currentCount >= MAX_APPLICATIONS_PER_APPLICANT) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Достигнут лимит: максимум ${MAX_APPLICATIONS_PER_APPLICANT} заявок`
      });
    }

    const specialtyCheck = await client.query(
      `
      SELECT 1
      FROM college_specialties cs
      JOIN specialties s ON s.id = cs.specialty_id
      JOIN colleges c ON c.id = cs.college_id
      WHERE cs.college_id = $1
        AND cs.specialty_id = $2
        AND cs.is_active = true
        AND s.status = 'active'
        AND c.status = 'active'
      LIMIT 1
      `,
      [collegeId, specialtyId]
    );

    if (specialtyCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Выбранная специальность недоступна в указанном колледже'
      });
    }

    const duplicateResult = await client.query(
      `
      SELECT id
      FROM applications
      WHERE applicant_id = $1
        AND college_id = $2
        AND specialty_id = $3
        AND status != 'cancelled'
      LIMIT 1
      `,
      [applicantId, collegeId, specialtyId]
    );

    if (duplicateResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Нельзя подать несколько заявлений на одну и ту же специальность в выбранном колледже'
      });
    }

    const insertResult = await client.query(
      `
      INSERT INTO applications (
        applicant_id,
        college_id,
        specialty_id,
        applicant_name,
        phone,
        email,
        avg_score,
        needs_dormitory
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, status, created_at
      `,
      [
        applicantId,
        collegeId,
        specialtyId,
        applicantName,
        normalizedPhone,
        normalizedEmail,
        parsedAvgScore,
        parsedNeedsDormitory
      ]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Заявка успешно подана',
      data: insertResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating application:', error);

    if (error.code === '23514') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Нельзя подать несколько заявлений на одну и ту же специальность в выбранном колледже'
      });
    }

    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

// Applicant applications (for counters and personal view)
router.get('/my', requireAuth, requireRole(['applicant']), async (req, res) => {
  try {
    const applicantId = req.user.userId;

    const applicationsResult = await db.query(
      `
      SELECT
        a.id,
        a.status,
        a.avg_score,
        a.needs_dormitory,
        a.created_at,
        a.college_id,
        a.specialty_id,
        c.name AS college_name,
        s.name AS specialty_name,
        s.code AS specialty_code
      FROM applications a
      JOIN colleges c ON c.id = a.college_id
      JOIN specialties s ON s.id = a.specialty_id
      WHERE a.applicant_id = $1
      ORDER BY a.created_at DESC
      `,
      [applicantId]
    );

    const total = applicationsResult.rows.filter((item) => item.status !== 'cancelled').length;

    return res.json({
      success: true,
      data: {
        total,
        remaining: Math.max(0, MAX_APPLICATIONS_PER_APPLICANT - total),
        limit: MAX_APPLICATIONS_PER_APPLICANT,
        applications: applicationsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching applicant applications:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Applications for college representative (own college only)
router.get('/college', requireAuth, requireRole(['college_rep']), async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { status, specialtyId } = req.query;

    if (!collegeId) {
      return res.status(400).json({ success: false, error: 'Колледж не привязан к пользователю' });
    }

    const conditions = ['a.college_id = $1'];
    const params = [collegeId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: 'Некорректный статус' });
      }

      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (specialtyId && specialtyId !== 'all') {
      const parsedSpecialtyId = Number(specialtyId);
      if (!Number.isInteger(parsedSpecialtyId) || parsedSpecialtyId <= 0) {
        return res.status(400).json({ success: false, error: 'Некорректная специальность' });
      }

      conditions.push(`a.specialty_id = $${paramIndex}`);
      params.push(parsedSpecialtyId);
      paramIndex += 1;
    }

    const query = `
      SELECT
        a.id,
        a.applicant_id,
        a.college_id,
        a.specialty_id,
        a.applicant_name,
        a.phone,
        a.email,
        a.avg_score,
        a.needs_dormitory,
        a.status,
        a.created_at,
        a.updated_at,
        a.decided_at,
        a.decided_by,
        s.name AS specialty_name,
        s.code AS specialty_code,
        u.name AS decided_by_name
      FROM applications a
      JOIN specialties s ON s.id = a.specialty_id
      LEFT JOIN users u ON u.id = a.decided_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE a.status
          WHEN 'pending' THEN 0
          WHEN 'accepted' THEN 1
          ELSE 2
        END,
        a.created_at DESC
    `;

    const result = await db.query(query, params);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching college applications:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/college/analytics', requireAuth, requireRole(['college_rep']), async (req, res) => {
  try {
    const collegeId = req.user.collegeId;

    if (!collegeId) {
      return res.status(400).json({ success: false, error: 'Колледж не привязан к пользователю' });
    }

    const [summaryResult, specialtyResult, dailyResult] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
          COALESCE(ROUND(AVG(avg_score)::numeric, 2), 0)::numeric AS avg_score,
          COUNT(*) FILTER (WHERE needs_dormitory = true)::int AS dormitory
        FROM applications
        WHERE college_id = $1
        `,
        [collegeId]
      ),
      db.query(
        `
        SELECT
          s.id AS specialty_id,
          s.code AS specialty_code,
          s.name AS specialty_name,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE a.status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE a.status = 'accepted')::int AS accepted,
          COUNT(*) FILTER (WHERE a.status = 'rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE a.status = 'cancelled')::int AS cancelled,
          COALESCE(ROUND(AVG(a.avg_score)::numeric, 2), 0)::numeric AS avg_score
        FROM applications a
        JOIN specialties s ON s.id = a.specialty_id
        WHERE a.college_id = $1
        GROUP BY s.id, s.code, s.name
        ORDER BY total DESC, s.name
        `,
        [collegeId]
      ),
      db.query(
        `
        SELECT
          day::date,
          COALESCE(COUNT(a.id), 0)::int AS total
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS day
        LEFT JOIN applications a
          ON a.college_id = $1
         AND a.created_at::date = day::date
        GROUP BY day
        ORDER BY day
        `,
        [collegeId]
      )
    ]);

    return res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0] || {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          cancelled: 0,
          avg_score: 0,
          dormitory: 0
        },
        bySpecialty: specialtyResult.rows,
        last7Days: dailyResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching college applications analytics:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.patch('/:id/cancel', requireAuth, requireRole(['applicant']), async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный идентификатор заявки' });
    }

    const updateResult = await db.query(
      `
      UPDATE applications
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND applicant_id = $2
        AND status = 'pending'
      RETURNING id, status, updated_at
      `,
      [applicationId, req.user.userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Заявка не найдена или её уже нельзя отменить'
      });
    }

    return res.json({
      success: true,
      message: 'Заявка отменена',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error cancelling application:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// Accept/reject application (college representative of the same college)
router.patch('/:id/status', requireAuth, requireRole(['college_rep']), async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const status = typeof req.body.status === 'string' ? req.body.status : '';
    const collegeId = req.user.collegeId;

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный идентификатор заявки' });
    }

    if (!ALLOWED_DECISION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Статус может быть только accepted или rejected'
      });
    }

    if (!collegeId) {
      return res.status(400).json({ success: false, error: 'Колледж не привязан к пользователю' });
    }

    const updateResult = await db.query(
      `
      UPDATE applications
      SET
        status = $1,
        decided_at = CURRENT_TIMESTAMP,
        decided_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
        AND college_id = $4
        AND status != 'cancelled'
      RETURNING id, status, decided_at, decided_by, updated_at
      `,
      [status, req.user.userId, applicationId, collegeId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Заявка не найдена или недоступна для вашего колледжа'
      });
    }

    return res.json({
      success: true,
      message: status === 'accepted' ? 'Заявка принята' : 'Заявка отклонена',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
