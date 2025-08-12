const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const transcriptController = require('../controllers/aiTranscriptController');

const router = express.Router();

// Configure multer for file uploads with enhanced security
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow one file
    fields: 10 // Limit number of fields
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
    }
    
    // Additional security checks
    if (file.originalname.length > 255) {
      return cb(new Error('Filename too long'), false);
    }
    
    // Check for suspicious file names
    const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs'];
    const fileName = file.originalname.toLowerCase();
    if (suspiciousPatterns.some(pattern => fileName.includes(pattern))) {
      return cb(new Error('Suspicious file detected'), false);
    }
    
    cb(null, true);
  }
});

// Upload and process transcript
router.post('/upload', 
  upload.single('transcript'),
  [
    body('apiKey').optional().isString(),
    body('model').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file && !req.body.transcriptText) {
        return res.status(400).json({ error: 'No file or text provided' });
      }

      const result = await transcriptController.processTranscript(req);
      res.json(result);
    } catch (error) {
      console.error('Transcript processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process transcript',
        message: error.message 
      });
    }
  }
);

// Process transcript text directly
router.post('/process-text',
  [
    body('transcriptText').isString().notEmpty(),
    body('apiKey').optional().isString(),
    body('model').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await transcriptController.processTranscriptText(req.body);
      res.json(result);
    } catch (error) {
      console.error('Text processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process transcript text',
        message: error.message 
      });
    }
  }
);

// Get processing status
router.get('/status/:jobId', async (req, res) => {
  try {
    const status = await transcriptController.getProcessingStatus(req.params.jobId);
    res.json(status);
  } catch (error) {
    res.status(404).json({ error: 'Job not found' });
  }
});

module.exports = router; 