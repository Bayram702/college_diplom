const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { moderateReviewText } = require('../utils/reviewModeration');

const router = express.Router();

const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация' });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return next();
  } catch {
    return res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

const requireApplicant = (req, res, next) => {
  if (req.user?.roleName !== 'applicant') {
    return res.status(403).json({ success: false, error: 'Отзывы могут оставлять только абитуриенты' });
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.roleName !== 'admin') {
    return res.status(403).json({ success: false, error: 'Доступ запрещён' });
  }

  return next();
};

const parsePositiveId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

const COMPLAINT_REASONS = new Set(['spam', 'offensive', 'false_info', 'personal_data', 'other']);
const COMPLAINT_ACTIONS = new Set(['hide_review', 'reject']);

const normalizeComplaint = (body) => {
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

  if (!COMPLAINT_REASONS.has(reason)) {
    return { ok: false, error: 'Некорректная причина жалобы' };
  }

  if (comment.length > 1000) {
    return { ok: false, error: 'Комментарий к жалобе не должен превышать 1000 символов' };
  }

  return {
    ok: true,
    reason,
    comment: comment || null
  };
};

const parseRating = (value) => {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
};

const buildSummary = (rows) => {
  const total = rows.reduce((sum, item) => sum + Number(item.count), 0);
  const average = total
    ? rows.reduce((sum, item) => sum + Number(item.rating) * Number(item.count), 0) / total
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const row = rows.find((item) => Number(item.rating) === rating);
    return {
      rating,
      count: row ? Number(row.count) : 0
    };
  });

  return {
    total,
    average: Number(average.toFixed(1)),
    distribution
  };
};

router.get('/college/:collegeId', async (req, res) => {
  try {
    const collegeId = parsePositiveId(req.params.collegeId);
    if (!collegeId) {
      return res.status(400).json({ success: false, error: 'Некорректный колледж' });
    }

    const collegeResult = await db.query(
      "SELECT id FROM colleges WHERE id = $1 AND status = 'active' LIMIT 1",
      [collegeId]
    );

    if (collegeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Колледж не найден' });
    }

    const [reviewsResult, summaryResult] = await Promise.all([
      db.query(
        `
        SELECT
          cr.id,
          cr.rating,
          cr.text,
          cr.created_at,
          cr.updated_at,
          u.name AS author_name
        FROM college_reviews cr
        JOIN users u ON u.id = cr.user_id
        WHERE cr.college_id = $1
          AND cr.status = 'published'
        ORDER BY cr.created_at DESC
        `,
        [collegeId]
      ),
      db.query(
        `
        SELECT rating, COUNT(*)::int AS count
        FROM college_reviews
        WHERE college_id = $1
          AND status = 'published'
        GROUP BY rating
        `,
        [collegeId]
      )
    ]);

    return res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        summary: buildSummary(summaryResult.rows)
      }
    });
  } catch (error) {
    console.error('Error fetching college reviews:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/college/:collegeId', requireAuth, requireApplicant, async (req, res) => {
  try {
    const collegeId = parsePositiveId(req.params.collegeId);
    const rating = parseRating(req.body.rating);
    const moderation = moderateReviewText(req.body.text);

    if (!collegeId) {
      return res.status(400).json({ success: false, error: 'Некорректный колледж' });
    }

    if (!rating) {
      return res.status(400).json({ success: false, error: 'Оценка должна быть от 1 до 5 звезд' });
    }

    if (!moderation.ok) {
      return res.status(400).json({ success: false, error: moderation.reason });
    }

    const collegeResult = await db.query(
      "SELECT id FROM colleges WHERE id = $1 AND status = 'active' LIMIT 1",
      [collegeId]
    );

    if (collegeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Колледж не найден' });
    }

    const result = await db.query(
      `
      INSERT INTO college_reviews (college_id, user_id, rating, text)
      VALUES ($1, $2, $3, $4)
      RETURNING id, college_id, user_id, rating, text, created_at, updated_at
      `,
      [collegeId, req.user.userId, rating, moderation.text]
    );

    return res.status(201).json({
      success: true,
      message: 'Отзыв опубликован',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating college review:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Вы уже оставили отзыв на этот колледж. Удалите старый отзыв в личном кабинете, чтобы написать новый.'
      });
    }

    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/my', requireAuth, requireApplicant, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        cr.id,
        cr.college_id,
        cr.rating,
        cr.text,
        cr.created_at,
        cr.updated_at,
        c.name AS college_name,
        ci.name AS city_name
      FROM college_reviews cr
      JOIN colleges c ON c.id = cr.college_id
      LEFT JOIN cities ci ON ci.id = c.city_id
      WHERE cr.user_id = $1
        AND cr.status = 'published'
      ORDER BY cr.created_at DESC
      `,
      [req.user.userId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.post('/:id/complaints', requireAuth, async (req, res) => {
  try {
    const reviewId = parsePositiveId(req.params.id);
    if (!reviewId) {
      return res.status(400).json({ success: false, error: 'Некорректный отзыв' });
    }

    const complaint = normalizeComplaint(req.body);
    if (!complaint.ok) {
      return res.status(400).json({ success: false, error: complaint.error });
    }

    const reviewResult = await db.query(
      "SELECT id FROM college_reviews WHERE id = $1 AND status = 'published' LIMIT 1",
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Отзыв не найден' });
    }

    const result = await db.query(
      `
      INSERT INTO review_complaints (review_id, reporter_user_id, reason, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING id, review_id, reporter_user_id, reason, comment, status, created_at
      `,
      [reviewId, req.user.userId, complaint.reason, complaint.comment]
    );

    return res.status(201).json({
      success: true,
      message: 'Жалоба отправлена',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'Вы уже отправили жалобу на этот отзыв'
      });
    }

    console.error('Error creating review complaint:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.get('/complaints', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        rc.id,
        rc.review_id,
        rc.reporter_user_id,
        rc.reason,
        rc.comment,
        rc.status,
        rc.resolved_by,
        rc.resolved_at,
        rc.created_at,
        cr.rating,
        cr.text AS review_text,
        cr.status AS review_status,
        cr.created_at AS review_created_at,
        c.id AS college_id,
        c.name AS college_name,
        author.name AS author_name,
        reporter.name AS reporter_name,
        resolver.name AS resolved_by_name
      FROM review_complaints rc
      JOIN college_reviews cr ON cr.id = rc.review_id
      JOIN colleges c ON c.id = cr.college_id
      JOIN users author ON author.id = cr.user_id
      JOIN users reporter ON reporter.id = rc.reporter_user_id
      LEFT JOIN users resolver ON resolver.id = rc.resolved_by
      ORDER BY
        CASE WHEN rc.status = 'pending' THEN 0 ELSE 1 END,
        rc.created_at DESC
      `
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching review complaints:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

router.patch('/complaints/:id', requireAuth, requireAdmin, async (req, res) => {
  const client = await db.connect();
  try {
    const complaintId = parsePositiveId(req.params.id);
    const action = typeof req.body.action === 'string' ? req.body.action : '';

    if (!complaintId) {
      return res.status(400).json({ success: false, error: 'Некорректная жалоба' });
    }

    if (!COMPLAINT_ACTIONS.has(action)) {
      return res.status(400).json({ success: false, error: 'Некорректное действие' });
    }

    await client.query('BEGIN');

    const complaintResult = await client.query(
      `
      SELECT id, review_id, status
      FROM review_complaints
      WHERE id = $1
      FOR UPDATE
      `,
      [complaintId]
    );

    if (complaintResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Жалоба не найдена' });
    }

    if (complaintResult.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Жалоба уже обработана' });
    }

    const nextStatus = action === 'hide_review' ? 'resolved_hidden' : 'resolved_rejected';

    if (action === 'hide_review') {
      await client.query(
        "UPDATE college_reviews SET status = 'hidden_by_complaint', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [complaintResult.rows[0].review_id]
      );
    }

    const updateResult = await client.query(
      `
      UPDATE review_complaints
      SET status = $1,
          resolved_by = $2,
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, review_id, reporter_user_id, reason, comment, status, resolved_by, resolved_at, created_at
      `,
      [nextStatus, req.user.userId, complaintId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: action === 'hide_review' ? 'Отзыв скрыт' : 'Жалоба отклонена',
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resolving review complaint:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAuth, requireApplicant, async (req, res) => {
  try {
    const reviewId = parsePositiveId(req.params.id);
    if (!reviewId) {
      return res.status(400).json({ success: false, error: 'Некорректный отзыв' });
    }

    const result = await db.query(
      `
      DELETE FROM college_reviews
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [reviewId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Отзыв не найден' });
    }

    return res.json({ success: true, message: 'Отзыв удален' });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

module.exports = router;
