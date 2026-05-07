const fs = require('fs');
const path = require('path');
const db = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, 'sql');

const ensureMigrationsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getSqlFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
};

const isApplied = async (filename) => {
  const result = await db.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1',
    [filename]
  );

  return result.rows.length > 0;
};

const markAsApplied = async (filename) => {
  await db.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
};

const runSqlMigrations = async () => {
  await ensureMigrationsTable();

  const files = getSqlFiles();
  if (files.length === 0) {
    console.log('ℹ️ SQL-миграции не найдены');
    return;
  }

  for (const filename of files) {
    const alreadyApplied = await isApplied(filename);
    if (alreadyApplied) {
      continue;
    }

    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(fullPath, 'utf8');

    console.log(`🛠️ Применение миграции: ${filename}`);
    await db.query(sql);
    await markAsApplied(filename);
    console.log(`✅ Миграция применена: ${filename}`);
  }
};

module.exports = runSqlMigrations;
