/**
 * Homework Upload Middleware
 * 
 * Handles single file uploads for homework attachments.
 * Enforces size limits (max 5MB) and allowed extensions (.jpg, .jpeg, .png, .pdf, .doc, .docx).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/homework');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hw-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  const bannedExtensions = ['.exe', '.bat', '.js', '.sh', '.vbs'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (bannedExtensions.includes(ext)) {
    cb(new Error('Security Alert: Executable files and scripts are prohibited.'), false);
  } else if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed formats: JPG, JPEG, PNG, PDF, DOC, DOCX.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  }
});

const homeworkAttachmentUpload = (req, res, next) => {
  const uploadSingle = upload.single('attachment');

  uploadSingle(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'An error occurred during homework attachment upload.'
      });
    }

    if (req.file) {
      req.homeworkAttachment = {
        fileName: req.file.originalname,
        filePath: `/uploads/homework/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      };
    }

    next();
  });
};

module.exports = homeworkAttachmentUpload;
