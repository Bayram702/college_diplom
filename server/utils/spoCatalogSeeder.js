const path = require('path');
const { pathToFileURL } = require('url');
const db = require('../db');

const catalogPath = path.join(__dirname, '../../client/src/data/spoSpecialties.js');

const seedSpoCatalog = async () => {
  const { spoSpecialtyGroups } = await import(pathToFileURL(catalogPath).href);

  for (const [sectorIndex, sector] of spoSpecialtyGroups.entries()) {
    const existingSector = await db.query(
      `SELECT id FROM sectors WHERE code = $1 LIMIT 1`,
      [sector.code]
    );

    let sectorId;
    if (existingSector.rows.length > 0) {
      sectorId = existingSector.rows[0].id;
      await db.query(
        `UPDATE sectors
         SET name = $2, is_active = true, sort_order = COALESCE(NULLIF(sort_order, 0), $3)
         WHERE id = $1`,
        [sectorId, sector.name, sectorIndex + 1]
      );
    } else {
      const createdSector = await db.query(
        `INSERT INTO sectors (name, code, description, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, NULL, $4, true)
         RETURNING id`,
        [
          sector.name,
          sector.code,
          `Укрупненная группа специальностей СПО ${sector.code}`,
          sectorIndex + 1
        ]
      );
      sectorId = createdSector.rows[0].id;
    }

    const values = sector.specialties.map(([specialtyCode, specialtyName]) => ({
      specialtyCode,
      specialtyName
    }));

    for (const item of values) {
      await db.query(
        `INSERT INTO spo_specialty_catalog (specialty_code, specialty_name, sector_code, sector_name, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (specialty_code) DO UPDATE SET
           specialty_name = EXCLUDED.specialty_name,
           sector_code = EXCLUDED.sector_code,
           sector_name = EXCLUDED.sector_name,
           updated_at = CURRENT_TIMESTAMP`,
        [item.specialtyCode, item.specialtyName, sector.code, sector.name]
      );

      await db.query(
        `INSERT INTO specialty_sectors (specialty_id, sector_id)
         SELECT s.id, $1
         FROM specialties s
         WHERE s.code = $2
         ON CONFLICT (specialty_id, sector_id) DO NOTHING`,
        [sectorId, item.specialtyCode]
      );
    }
  }
};

module.exports = seedSpoCatalog;
