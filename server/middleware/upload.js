const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаём директорию для загрузок, если её нет
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const collegeImagesDir = path.join(uploadsDir, 'colleges');
if (!fs.existsSync(collegeImagesDir)) {
  fs.mkdirSync(collegeImagesDir, { recursive: true });
}

const applicationDocumentsDir = path.join(uploadsDir, 'application-documents');
if (!fs.existsSync(applicationDocumentsDir)) {
  fs.mkdirSync(applicationDocumentsDir, { recursive: true });
}

const APPLICATION_DOCUMENT_TYPES = ['passport', 'certificate', 'snils', 'consent'];

const isAllowedApplicationDocumentType = (documentType) => APPLICATION_DOCUMENT_TYPES.includes(documentType);

// Конфигурация хранилища
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (req.uploadTarget === 'application-document') {
      cb(null, applicationDocumentsDir);
      return;
    }

    cb(null, collegeImagesDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла: college-{timestamp}-{random}.{ext}
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const prefix = req.uploadTarget === 'application-document'
      ? `application-${req.user?.userId || 'user'}-${req.body.documentType || 'document'}`
      : 'college';
    const fileName = `${prefix}-${uniqueSuffix}${ext}`;
    
    // Сохраняем имя файла в запросе для дальнейшего использования
    req.uploadedFileName = fileName;
    
    cb(null, fileName);
  }
});

// Фильтр файлов - разрешаем только изображения
const fileFilter = (req, file, cb) => {
  const allowedTypes = req.uploadTarget === 'application-document'
    ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат файла. Разрешены только изображения (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Конфигурация multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB максимум
  },
  fileFilter: fileFilter
});

upload.APPLICATION_DOCUMENT_TYPES = APPLICATION_DOCUMENT_TYPES;
upload.isAllowedApplicationDocumentType = isAllowedApplicationDocumentType;

module.exports = upload;
