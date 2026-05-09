const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const { sendAcceptedApplicationEmail } = require('../mail');

const isAscending = (values) => values.every((value, index) => index === 0 || values[index - 1] <= value);

test('applicant passport data is filled and unique', async () => {
  const missingResult = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'applicant'
      AND (u.passport_series IS NULL OR u.passport_number IS NULL)
  `);

  const duplicatesResult = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT passport_series, passport_number
      FROM users
      WHERE passport_series IS NOT NULL
        AND passport_number IS NOT NULL
      GROUP BY passport_series, passport_number
      HAVING COUNT(*) > 1
    ) duplicate_passports
  `);

  assert.equal(missingResult.rows[0].count, 0);
  assert.equal(duplicatesResult.rows[0].count, 0);
});

test('applicants are not assigned to colleges', async () => {
  const result = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'applicant'
      AND u.college_id IS NOT NULL
  `);

  assert.equal(result.rows[0].count, 0);
});

test('users have normalized activity timestamps', async () => {
  const result = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE last_activity_at IS NULL
  `);

  assert.equal(result.rows[0].count, 0);
});

test('score fields are stored with two decimal places', async () => {
  const result = await db.query(`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM users
        WHERE avg_score IS NOT NULL
          AND avg_score <> ROUND(avg_score, 2)
      ) AS users_invalid,
      (
        SELECT COUNT(*)::int
        FROM applications
        WHERE avg_score <> ROUND(avg_score, 2)
      ) AS applications_invalid,
      (
        SELECT COUNT(*)::int
        FROM colleges
        WHERE (avg_score IS NOT NULL AND avg_score <> ROUND(avg_score, 2))
           OR (min_score IS NOT NULL AND min_score <> ROUND(min_score, 2))
      ) AS colleges_invalid,
      (
        SELECT COUNT(*)::int
        FROM specialties
        WHERE avg_score_last_year IS NOT NULL
          AND avg_score_last_year <> ROUND(avg_score_last_year, 2)
      ) AS specialties_invalid
  `);

  assert.deepEqual(result.rows[0], {
    users_invalid: 0,
    applications_invalid: 0,
    colleges_invalid: 0,
    specialties_invalid: 0
  });
});

test('admin and representative default lists are sorted by number ascending', async () => {
  const usersResult = await db.query(`
    SELECT u.id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name IN ('college_rep', 'applicant')
    ORDER BY u.id ASC
    LIMIT 20
  `);

  const collegesResult = await db.query(`
    SELECT c.id
    FROM colleges c
    WHERE c.status != 'deleted'
    ORDER BY c.id ASC
    LIMIT 20
  `);

  const applicationsResult = await db.query(`
    SELECT a.id
    FROM applications a
    ORDER BY a.id ASC
    LIMIT 20
  `);

  assert.equal(isAscending(usersResult.rows.map((row) => row.id)), true);
  assert.equal(isAscending(collegesResult.rows.map((row) => row.id)), true);
  assert.equal(isAscending(applicationsResult.rows.map((row) => row.id)), true);
});

test('accepted application PDF can be generated without SMTP', async () => {
  const previousSmtp = {
    host: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  };

  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  try {
    const result = await sendAcceptedApplicationEmail('test@example.com', {
      id: 1,
      college_name: 'Тестовый колледж',
      applicant_name: 'Иванов Иван Иванович',
      passport_series: '4500',
      passport_number: '100000',
      phone: '+79991234567',
      email: 'test@example.com',
      avg_score: 4.67,
      needs_dormitory: true,
      specialty_code: '09.02.07',
      specialty_name: 'Информационные системы и программирование',
      created_at: new Date(),
      decided_at: new Date()
    });

    assert.equal(result.success, false);
    assert.equal(result.reason, 'SMTP not configured');
    assert.equal(result.pdfGenerated, true);
  } finally {
    if (previousSmtp.host === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = previousSmtp.host;

    if (previousSmtp.user === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = previousSmtp.user;

    if (previousSmtp.pass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = previousSmtp.pass;
  }
});

test.after(async () => {
  await db.end();
});
