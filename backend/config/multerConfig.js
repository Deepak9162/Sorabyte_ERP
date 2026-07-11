/**
 * Multer Config
 * 
 * Enforces file constraints: destination path, size limits (5MB),
 * and supported media types (JPG, JPEG, PNG).
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Target directory for student photo storage
const uploadDir = path.join(__dirname, '../uploads/students');

// Automatically instantiate upload directory if not present
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate secure filename: student-[timestamp]-[random].[ext]
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `student-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const bannedExtensions = ['.exe', '.bat', '.js'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (bannedExtensions.includes(ext)) {
    cb(new Error('Security Alert: Executables and scripts (.exe, .bat, .js) are strictly prohibited.'), false);
  } else if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF files are supported.'), false);
  }
};

// Instantiate upload configuration
const uploadConfig = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = uploadConfig;
