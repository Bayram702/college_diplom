const { Pool } = require('pg');
require('dotenv').config(); // Для загрузки переменных из .env

// Настройка подключения
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',      // Имя пользователя (обычно postgres)
  host: process.env.DB_HOST || 'localhost',     // Адрес сервера
  database: process.env.DB_NAME || 'colleges_db', // Имя базы данных (которую вы создали)
  password: process.env.DB_PASSWORD || 'postgres', // Ваш пароль от PostgreSQL
  port: process.env.DB_PORT || 5432,            // Порт (по умолчанию 5432)
});

// Проверка подключения
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err);
  } else {
    console.log('✅ Подключение к PostgreSQL успешно установлено!');
  }
});

module.exports = pool;