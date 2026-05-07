const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');
const db = require('../db');

// Middleware для проверки авторизации
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Недействительный токен' });
  }
};

// Загрузка изображения для колледжа
router.post('/college-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    console.log('📸 POST /api/upload/college-image');
    
    const { imageType } = req.body; // 'logo' или 'main'
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    if (imageType !== 'logo') {
      return res.status(400).json({ success: false, error: 'Доступна только загрузка логотипа колледжа' });
    }

    // Определяем колледж пользователя
    const collegeId = req.user.collegeId;
    if (!collegeId) {
      return res.status(404).json({ success: false, error: 'Колледж не привязан к пользователю' });
    }

    // Формируем URL для доступа к изображению
    const imageUrl = `/uploads/colleges/${req.uploadedFileName}`;

    // Обновляем соответствующее поле в базе данных
    const fieldName = 'logo_image_url';
    const query = `UPDATE colleges SET ${fieldName} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name`;
    
    const result = await db.query(query, [imageUrl, collegeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Колледж не найден' });
    }

    console.log(`✅ Изображение загружено: ${fieldName} = ${imageUrl}`);

    res.json({
      success: true,
      message: 'Изображение успешно загружено',
      data: {
        imageUrl: imageUrl,
        imageType: imageType,
        collegeId: collegeId
      }
    });

  } catch (error) {
    console.error('❌ Error uploading college image:', error);
    
    // Если ошибка multer
    if (error instanceof Error) {
      if (error.message.includes('Неподдерживаемый формат')) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }
    
    res.status(500).json({ success: false, error: 'Ошибка сервера: ' + error.message });
  }
});

module.exports = router;
