// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const runSqlMigrations = require('./run-sql-migrations');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

// Раздаём статические файлы из папки uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Подключаем роуты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/specialties', require('./routes/specialties'));
app.use('/api/sectors', require('./routes/sectors'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/reviews', require('./routes/reviews'));

// API для представителя колледжа (ДО общего /api/colleges!)
app.use('/api/colleges/specialties', require('./routes/rep-specialties'));
app.use('/api/colleges/addresses', require('./routes/rep-addresses'));

// Общий роут колледжей (должен быть ПОСЛЕ специфичных!)
app.use('/api/colleges', require('./routes/colleges'));

// Загрузка изображений для колледжа
app.use('/api/upload', require('./routes/upload'));

const startServer = async () => {
  try {
    await runSqlMigrations();

    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Не удалось применить миграции:', error);
    process.exit(1);
  }
};

startServer();
