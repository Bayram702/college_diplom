const db = require('./db');

async function columnExists(client, columnName) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'colleges' AND column_name = $1`,
    [columnName]
  );

  return result.rows.length > 0;
}

async function migrate() {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const hasSocialTelegram = await columnExists(client, 'social_telegram');
    const hasSocialMax = await columnExists(client, 'social_max');

    if (hasSocialTelegram && !hasSocialMax) {
      await client.query('ALTER TABLE colleges RENAME COLUMN social_telegram TO social_max');
      console.log('Renamed colleges.social_telegram -> colleges.social_max');
    }

    const hasMainImage = await columnExists(client, 'main_image_url');
    if (hasMainImage) {
      await client.query('ALTER TABLE colleges DROP COLUMN main_image_url');
      console.log('Dropped colleges.main_image_url');
    }

    await client.query('COMMIT');
    console.log('College sources migration completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('College sources migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

migrate();
