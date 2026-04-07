const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const geminiService = require('../services/geminiService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `scan_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.post('/scan', upload.single('image'), async (req, res) => {
  const filePath = req.file ? req.file.path : null;

  try {
    if (!filePath) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY tanımlı değil. .env dosyasını kontrol et.' });
    }

    const result = await geminiService.scanLabel(filePath);
    return res.json(result);
  } catch (err) {
    console.error('OCR scan error:', err);
    return res.status(500).json({ error: err.message || 'OCR processing failed' });
  } finally {
    // Clean up temp file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

module.exports = router;
