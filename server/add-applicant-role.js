const db = require('./db');

async function addApplicantRole() {
  try {
    console.log('🔍 Проверка наличия роли applicant...');
    
    const checkResult = await db.query(`SELECT id, name, description FROM roles WHERE name = 'applicant'`);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Роль applicant уже существует:', checkResult.rows[0]);
    } else {
      console.log('➕ Добавление роли applicant...');
      
      const insertResult = await db.query(`
        INSERT INTO roles (name, description) 
        VALUES ('applicant', 'Абитуриент - пользователь, просматривающий колледжи и специальности')
        RETURNING id, name, description
      `);
      
      console.log('✅ Роль applicant успешно добавлена:', insertResult.rows[0]);
    }
    
    // Показать все роли
    console.log('\n📋 Все роли в системе:');
    const allRoles = await db.query(`SELECT id, name, description FROM roles ORDER BY id`);
    allRoles.rows.forEach(row => {
      console.log(`  ${row.id}. ${row.name} - ${row.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

addApplicantRole();
