// server/routes/rep-specialties.js — CRUD специальностей для представителя
const express = require('express')
const router = express.Router()
const db = require('../db')

const requireCollegeRep = async (req, res, next) => {
  try {
    console.log('🔑 requireCollegeRep: проверяем токен')
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' })
    const jwt = require('jsonwebtoken')
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    console.log('🔑 JWT_SECRET:', jwtSecret.substring(0, 15) + '...')
    const decoded = jwt.verify(token, jwtSecret)
    console.log('🔑 Decoded:', decoded)
    if (decoded.roleName !== 'college_rep' && decoded.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'Доступ запрещён' })
    }
    req.user = decoded
    console.log('✅ requireCollegeRep OK, collegeId:', req.user.collegeId)
    next()
  } catch (e) {
    console.error('❌ requireCollegeRep error:', e.name, e.message)
    res.status(401).json({ success: false, error: 'Недействительный токен' })
  }
}

// Получить специальности колледжа представителя
router.get('/', requireCollegeRep, async (req, res) => {
  try {
    console.log('🎓 GET /api/colleges/specialties - collegeId:', req.user.collegeId)
    const query = `
      SELECT s.id, s.code, s.name, s.description, s.qualification, s.duration,
             s.base_education, s.form, s.exams, s.avg_score_last_year as avg_score,
             s.status, cs.budget_places, cs.commercial_places, cs.price_per_year
      FROM college_specialties cs
      JOIN specialties s ON cs.specialty_id = s.id
      WHERE cs.college_id = $1 AND cs.is_active = true
      ORDER BY s.sort_order, s.name
    `
    const result = await db.query(query, [req.user.collegeId])
    console.log('📊 Rows:', result.rows.length)
    res.json({ success: true, data: result.rows })
  } catch (e) {
    console.error('❌ Error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

// Создать специальность
router.post('/', requireCollegeRep, async (req, res) => {
  try {
    const { name, code, description, qualification, duration, base_education, form, exams, budget_places, commercial_places, price_per_year, avg_score, status } = req.body

    const specResult = await db.query(
      `INSERT INTO specialties (code, name, description, qualification, duration, base_education, form, exams, avg_score_last_year, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [code, name, description, qualification, duration, base_education, form, exams, avg_score || null, status || 'active']
    )
    const specId = specResult.rows[0].id

    await db.query(
      `INSERT INTO college_specialties (college_id, specialty_id, budget_places, commercial_places, price_per_year)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.user.collegeId, specId, budget_places || 0, commercial_places || 0, price_per_year || 0]
    )

    res.json({ success: true, message: 'Специальность создана', data: { id: specId } })
  } catch (e) {
    console.error('Error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

// Обновить специальность
router.put('/:id', requireCollegeRep, async (req, res) => {
  try {
    const { id } = req.params
    const { name, code, description, qualification, duration, base_education, form, exams, budget_places, commercial_places, price_per_year, avg_score, status } = req.body

    await db.query(
      `UPDATE specialties SET code=$1, name=$2, description=$3, qualification=$4, duration=$5,
       base_education=$6, form=$7, exams=$8, avg_score_last_year=$9, status=$10 WHERE id=$11`,
      [code, name, description, qualification, duration, base_education, form, exams, avg_score || null, status, id]
    )

    await db.query(
      `UPDATE college_specialties SET budget_places=$1, commercial_places=$2, price_per_year=$3
       WHERE specialty_id=$4 AND college_id=$5`,
      [budget_places, commercial_places, price_per_year, id, req.user.collegeId]
    )

    res.json({ success: true, message: 'Специальность обновлена' })
  } catch (e) {
    console.error('Error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

// Удалить специальность
router.delete('/:id', requireCollegeRep, async (req, res) => {
  try {
    const { id } = req.params
    await db.query(`UPDATE college_specialties SET is_active=false WHERE specialty_id=$1 AND college_id=$2`, [id, req.user.collegeId])
    await db.query(`UPDATE specialties SET status='inactive' WHERE id=$1`, [id])
    res.json({ success: true, message: 'Специальность удалена' })
  } catch (e) {
    console.error('Error:', e)
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
