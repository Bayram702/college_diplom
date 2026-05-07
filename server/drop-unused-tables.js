// server/drop-unused-tables.js
// Скрипт для удаления пустых неиспользуемых таблиц из БД
const db = require('./db');

const dropUnusedTables = async () => {
  console.log('🗑️ Начинаем удаление неиспользуемых таблиц...\n');

  const tables = [
    { name: 'news', reason: 'Нет API-роутов и обращений в коде' },
    { name: 'college_photos', reason: 'Нет обращений в серверном коде' },
    { name: 'favorites', reason: 'Нет API-роутов и обращений в коде' },
    { name: 'statistics_views', reason: 'Нет обращений в коде' },
  ];

  for (const table of tables) {
    try {
      console.log(`🗑️ Удаляем таблицу "${table.name}" (${table.reason})...`);
      await db.query(`DROP TABLE IF EXISTS public.${table.name} CASCADE`);
      console.log(`  ✅ Таблица "${table.name}" удалена\n`);
    } catch (error) {
      console.error(`  ❌ Ошибка при удалении "${table.name}":`, error.message, '\n');
    }
  }

  // Удаляем связанные последовательности (если остались)
  const sequences = [
    'news_id_seq',
    'college_photos_id_seq',
    'favorites_id_seq',
    'statistics_views_id_seq',
  ];

  for (const seq of sequences) {
    try {
      await db.query(`DROP SEQUENCE IF EXISTS public.${seq} CASCADE`);
    } catch (error) {
      // Игнорируем ошибки, если последовательность уже удалена
    }
  }

  console.log('✅ Удаление завершено!\n');
  console.log('📋 Оставшиеся таблицы:');
  console.log('  - users (пользователи)');
  console.log('  - roles (роли)');
  console.log('  - cities (города)');
  console.log('  - colleges (колледжи)');
  console.log('  - specialties (специальности)');
  console.log('  - sectors (отрасли)');
  console.log('  - college_specialties (связь колледж-специальность)');
  console.log('  - specialty_sectors (связь специальность-отрасль)');
  console.log('  - college_addresses (адреса колледжей)');
  console.log('  - login_logs (логирование входа)');
  console.log('  - user_sessions (сессии)');
  console.log('  - audit_logs (аудит действий)');
  console.log('  - site_settings (настройки сайта)');

  process.exit(0);
};

dropUnusedTables();
