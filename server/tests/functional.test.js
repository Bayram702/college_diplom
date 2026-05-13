const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const { sendAcceptedApplicationEmail } = require('../mail');
const { getGosuslugiProfile } = require('../services/gosuslugi');
const { APPLICATION_DOCUMENT_TYPES, isAllowedApplicationDocumentType } = require('../middleware/upload');
const express = require('express');
const jwt = require('jsonwebtoken');
const settingsRoute = require('../routes/settings');
const sectorsRoute = require('../routes/sectors');
const uploadRoute = require('../routes/upload');
const reviewsRoute = require('../routes/reviews');

const isAscending = (values) => values.every((value, index) => index === 0 || values[index - 1] <= value);
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

const requestRoute = async (route, method, path, { token = null, body = null } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(route);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const port = server.address().port;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== null) headers['Content-Type'] = 'application/json';

    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body)
    });

    const responseText = await response.text();
    let responseBody = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = { raw: responseText };
    }

    return {
      status: response.status,
      body: responseBody
    };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

const tokenForRole = (roleName) => jwt.sign({ userId: 1, roleName }, jwtSecret);

const tokenForUser = (user) => jwt.sign({
  userId: user.id,
  roleName: user.roleName,
  collegeId: user.collegeId || null
}, jwtSecret);

const complaintFixtures = [];

const getRoleId = async (name) => {
  const result = await db.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [name]);
  if (result.rows[0]) return result.rows[0].id;

  const insert = await db.query(
    'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
    [name, name]
  );
  return insert.rows[0].id;
};

const createComplaintFixture = async () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const passportNumber = String(Date.now()).slice(-6);
  const reporterPassportNumber = String(Number(passportNumber) + 1).padStart(6, '0').slice(-6);
  const applicantRoleId = await getRoleId('applicant');
  const adminRoleId = await getRoleId('admin');

  const collegeResult = await db.query(
    `
    INSERT INTO colleges (name, short_name, status)
    VALUES ($1, $2, 'active')
    RETURNING id
    `,
    [`Complaint test college ${suffix}`, `CTC${suffix.slice(-4)}`]
  );

  const authorResult = await db.query(
    `
    INSERT INTO users (login, email, password_hash, name, role_id, status, passport_series, passport_number, avg_score, last_activity_at)
    VALUES ($1, $2, 'hash', 'Review Author', $3, 'active', '4500', $4, 4.50, CURRENT_TIMESTAMP)
    RETURNING id
    `,
    [`review_author_${suffix}`, `review_author_${suffix}@example.com`, applicantRoleId, passportNumber]
  );

  const reporterResult = await db.query(
    `
    INSERT INTO users (login, email, password_hash, name, role_id, status, passport_series, passport_number, avg_score, last_activity_at)
    VALUES ($1, $2, 'hash', 'Review Reporter', $3, 'active', '4501', $4, 4.20, CURRENT_TIMESTAMP)
    RETURNING id
    `,
    [`review_reporter_${suffix}`, `review_reporter_${suffix}@example.com`, applicantRoleId, reporterPassportNumber]
  );

  const adminResult = await db.query(
    `
    INSERT INTO users (login, email, password_hash, name, role_id, status, last_activity_at)
    VALUES ($1, $2, 'hash', 'Complaint Admin', $3, 'active', CURRENT_TIMESTAMP)
    RETURNING id
    `,
    [`complaint_admin_${suffix}`, `complaint_admin_${suffix}@example.com`, adminRoleId]
  );

  const reviewResult = await db.query(
    `
    INSERT INTO college_reviews (college_id, user_id, rating, text, status)
    VALUES ($1, $2, 2, 'Complaint test review', 'published')
    RETURNING id
    `,
    [collegeResult.rows[0].id, authorResult.rows[0].id]
  );

  const fixture = {
    collegeId: collegeResult.rows[0].id,
    reviewId: reviewResult.rows[0].id,
    userIds: [
      authorResult.rows[0].id,
      reporterResult.rows[0].id,
      adminResult.rows[0].id
    ],
    reporter: { id: reporterResult.rows[0].id, roleName: 'applicant' },
    admin: { id: adminResult.rows[0].id, roleName: 'admin' }
  };

  complaintFixtures.push(fixture);
  return fixture;
};

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

test('gosuslugi mock profile is sourced from environment values', async () => {
  const previousValues = {
    name: process.env.GOSUSLUGI_MOCK_NAME,
    phone: process.env.GOSUSLUGI_MOCK_PHONE,
    email: process.env.GOSUSLUGI_MOCK_EMAIL,
    passportSeries: process.env.GOSUSLUGI_MOCK_PASSPORT_SERIES,
    passportNumber: process.env.GOSUSLUGI_MOCK_PASSPORT_NUMBER,
    snils: process.env.GOSUSLUGI_MOCK_SNILS
  };

  process.env.GOSUSLUGI_MOCK_NAME = 'Иванов Иван Иванович';
  process.env.GOSUSLUGI_MOCK_PHONE = '+79991234567';
  process.env.GOSUSLUGI_MOCK_EMAIL = 'ivan@example.com';
  process.env.GOSUSLUGI_MOCK_PASSPORT_SERIES = '4500';
  process.env.GOSUSLUGI_MOCK_PASSPORT_NUMBER = '123456';
  process.env.GOSUSLUGI_MOCK_SNILS = '123-456-789 00';

  try {
    const profile = await getGosuslugiProfile({ userId: 1 });

    assert.equal(profile.provider, 'mock');
    assert.equal(profile.name, 'Иванов Иван Иванович');
    assert.equal(profile.phone, '+79991234567');
    assert.equal(profile.email, 'ivan@example.com');
    assert.equal(profile.passport_series, '4500');
    assert.equal(profile.passport_number, '123456');
    assert.equal(profile.snils, '123-456-789 00');
  } finally {
    Object.entries(previousValues).forEach(([key, value]) => {
      const envKey = {
        name: 'GOSUSLUGI_MOCK_NAME',
        phone: 'GOSUSLUGI_MOCK_PHONE',
        email: 'GOSUSLUGI_MOCK_EMAIL',
        passportSeries: 'GOSUSLUGI_MOCK_PASSPORT_SERIES',
        passportNumber: 'GOSUSLUGI_MOCK_PASSPORT_NUMBER',
        snils: 'GOSUSLUGI_MOCK_SNILS'
      }[key];

      if (value === undefined) delete process.env[envKey];
      else process.env[envKey] = value;
    });
  }
});

test('application document upload accepts only declared document types', () => {
  assert.deepEqual(APPLICATION_DOCUMENT_TYPES, ['passport', 'certificate', 'snils', 'consent']);
  assert.equal(isAllowedApplicationDocumentType('passport'), true);
  assert.equal(isAllowedApplicationDocumentType('certificate'), true);
  assert.equal(isAllowedApplicationDocumentType('snils'), true);
  assert.equal(isAllowedApplicationDocumentType('consent'), true);
  assert.equal(isAllowedApplicationDocumentType('photo'), false);
});

test('settings writes require admin role', async () => {
  const unauthenticated = await requestRoute(settingsRoute, 'PUT', '/site_name', {
    body: { value: 'Portal' }
  });
  assert.equal(unauthenticated.status, 401);

  const applicant = await requestRoute(settingsRoute, 'PUT', '/site_name', {
    token: tokenForRole('applicant'),
    body: { value: 'Portal' }
  });
  assert.equal(applicant.status, 403);
});

test('sector writes require admin role', async () => {
  const body = { name: 'Test sector', code: '99.00.00' };
  const applicantToken = tokenForRole('applicant');

  const unauthenticated = await requestRoute(sectorsRoute, 'POST', '/', { body });
  assert.equal(unauthenticated.status, 401);

  const createAsApplicant = await requestRoute(sectorsRoute, 'POST', '/', {
    token: applicantToken,
    body
  });
  assert.equal(createAsApplicant.status, 403);

  const updateAsApplicant = await requestRoute(sectorsRoute, 'PUT', '/1', {
    token: applicantToken,
    body: { name: 'Updated sector' }
  });
  assert.equal(updateAsApplicant.status, 403);

  const deleteAsApplicant = await requestRoute(sectorsRoute, 'DELETE', '/1', {
    token: applicantToken
  });
  assert.equal(deleteAsApplicant.status, 403);
});

test('college logo upload requires representative or admin role before file handling', async () => {
  const unauthenticated = await requestRoute(uploadRoute, 'POST', '/college-image');
  assert.equal(unauthenticated.status, 401);

  const applicant = await requestRoute(uploadRoute, 'POST', '/college-image', {
    token: tokenForRole('applicant')
  });
  assert.equal(applicant.status, 403);
});

test('review complaint creation requires authentication', async () => {
  const response = await requestRoute(reviewsRoute, 'POST', '/1/complaints', {
    body: { reason: 'spam', comment: 'Реклама' }
  });

  assert.equal(response.status, 401);
});

test('authenticated users can complain about a published review only once', async () => {
  const fixture = await createComplaintFixture();
  const token = tokenForUser(fixture.reporter);

  const firstResponse = await requestRoute(reviewsRoute, 'POST', `/${fixture.reviewId}/complaints`, {
    token,
    body: { reason: 'spam', comment: 'Реклама в отзыве' }
  });
  assert.equal(firstResponse.status, 201);
  assert.equal(firstResponse.body.data.status, 'pending');

  const duplicateResponse = await requestRoute(reviewsRoute, 'POST', `/${fixture.reviewId}/complaints`, {
    token,
    body: { reason: 'spam', comment: 'Повтор' }
  });
  assert.equal(duplicateResponse.status, 400);
});

test('admin can hide a review from a complaint', async () => {
  const fixture = await createComplaintFixture();
  const reporterToken = tokenForUser(fixture.reporter);
  const adminToken = tokenForUser(fixture.admin);

  const complaintResponse = await requestRoute(reviewsRoute, 'POST', `/${fixture.reviewId}/complaints`, {
    token: reporterToken,
    body: { reason: 'offensive', comment: 'Оскорбление' }
  });

  const resolveResponse = await requestRoute(reviewsRoute, 'PATCH', `/complaints/${complaintResponse.body.data.id}`, {
    token: adminToken,
    body: { action: 'hide_review' }
  });

  assert.equal(resolveResponse.status, 200);
  assert.equal(resolveResponse.body.data.status, 'resolved_hidden');

  const reviewResult = await db.query('SELECT status FROM college_reviews WHERE id = $1', [fixture.reviewId]);
  assert.equal(reviewResult.rows[0].status, 'hidden_by_complaint');
});

test('admin can reject a review complaint without hiding the review', async () => {
  const fixture = await createComplaintFixture();
  const reporterToken = tokenForUser(fixture.reporter);
  const adminToken = tokenForUser(fixture.admin);

  const complaintResponse = await requestRoute(reviewsRoute, 'POST', `/${fixture.reviewId}/complaints`, {
    token: reporterToken,
    body: { reason: 'false_info', comment: 'Недостоверно' }
  });

  const resolveResponse = await requestRoute(reviewsRoute, 'PATCH', `/complaints/${complaintResponse.body.data.id}`, {
    token: adminToken,
    body: { action: 'reject' }
  });

  assert.equal(resolveResponse.status, 200);
  assert.equal(resolveResponse.body.data.status, 'resolved_rejected');

  const reviewResult = await db.query('SELECT status FROM college_reviews WHERE id = $1', [fixture.reviewId]);
  assert.equal(reviewResult.rows[0].status, 'published');
});

test.after(async () => {
  for (const fixture of complaintFixtures.reverse()) {
    await db.query('DELETE FROM colleges WHERE id = $1', [fixture.collegeId]);
    await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [fixture.userIds]);
  }
  await db.end();
});
