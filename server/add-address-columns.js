// server/add-address-columns.js
const db = require('./db')

async function addColumns() {
  try {
    const columns = [
      { name: 'address_type', type: "VARCHAR(50) DEFAULT 'educational'" },
      { name: 'working_hours', type: 'VARCHAR(100)' },
      { name: 'contact_person', type: 'VARCHAR(255)' }
    ]

    for (const col of columns) {
      const checkRes = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'college_addresses' AND column_name = $1`,
        [col.name]
      )
      if (checkRes.rows.length === 0) {
        await db.query(`ALTER TABLE college_addresses ADD COLUMN ${col.name} ${col.type}`)
        console.log(`✅ Добавлена колонка: ${col.name}`)
      } else {
        console.log(`⏭️ Колонка ${col.name} уже существует`)
      }
    }

    console.log('✅ Миграция завершена')
    process.exit(0)
  } catch (e) {
    console.error('❌ Ошибка:', e)
    process.exit(1)
  }
}

addColumns()
