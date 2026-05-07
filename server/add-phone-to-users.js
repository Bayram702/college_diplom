const db = require('./db');

async function addPhoneColumn() {
  try {
    console.log('🔍 Проверка наличия поля phone в таблице users...');
    
    const checkResult = await db.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Поле phone уже существует:', checkResult.rows[0]);
    } else {
      console.log('➕ Добавление поля phone...');
      
      await db.query(`ALTER TABLE public.users ADD COLUMN phone character varying(50)`);
      
      console.log('✅ Поле phone успешно добавлено в таблицу users');
    }
    
    // Показать все поля таблицы users
    console.log('\n📋 Все поля таблицы users:');
    const columns = await db.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    columns.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`  - ${row.column_name}: ${row.data_type}${length}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

addPhoneColumn();
