/**
 * documentRoutes.js — Enterprise Document Management Routes (Phase 12)
 * Extends existing routes with full Phase 12 capabilities.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/rbacMiddleware');
const documentController = require('../controllers/documentController');

// Ensure uploads directory exists (safely falls back to /tmp/uploads in serverless environments)
const os = require('os');
let uploadDir = path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
  uploadDir = path.join(os.tmpdir(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760') }
});

router.use(authenticate);

// Document CRUD
router.get('/', documentController.getAll);
router.get('/storage-stats', documentController.getStorageStats);
router.post('/upload', upload.single('file'), documentController.upload);
router.get('/:id', documentController.getById);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);
router.get('/:id/download', documentController.download);
router.get('/:id/preview', documentController.preview);
router.put('/:id/replace', upload.single('file'), documentController.replace);

// Versioning & History
router.get('/:id/versions', documentController.getVersions);
router.get('/:id/history', documentController.getHistory);

// Legacy: get by ticket
router.get('/ticket/:ticketId', documentController.getByTicket);

// Categories
router.get('/meta/categories', documentController.getCategories);
router.post('/meta/categories', checkPermission('settings:write'), documentController.createCategory);

module.exports = router;
