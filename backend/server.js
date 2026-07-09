/**
 * Little Flower English School ERP — Server Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const path = require('path');

// Utilities
const connectDB = require('./utils/db');
const logger = require('./utils/logger');

// Middleware
const errorHandler = require('./middleware/errorHandler');

// Routes
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const adminRoutes = require('./routes/adminRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const feeRoutes = require('./routes/feeRoutes');
const academicRoutes = require('./routes/academicRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const adminTimetableRoutes = require('./routes/adminTimetableRoutes');
const announcementRoutes = require('./routes/announcementRoutes');

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Auth middleware
const { protect, isAdmin, isTeacher } = require('./middleware/auth');

// ──────────────────────────────────────────────
// Initialize App
// ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Render/Vercel (needed for express-rate-limit)
app.set('trust proxy', 1);

// ──────────────────────────────────────────────
// Security Middleware
// ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://api.qrserver.com", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5173", "https://school-management-system-tan-three.vercel.app", "https://erp-taupe-zeta-35.vercel.app"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  xssFilter: true, // Prevent Cross-site scripting (XSS) attacks
  noSniff: true, // Prevent MIME-sniffing
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://school-management-system-tan-three.vercel.app',
  'https://erp-taupe-zeta-35.vercel.app'
];

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...customOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    const isLocal = origin && (
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:')
    );
    
    if (!origin || isLocal || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting (Relaxed to 1000 requests per 15 mins to accommodate intensive operations like Bulk ID Cards)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// ──────────────────────────────────────────────
// Body Parsers & Logging & Compression
// ──────────────────────────────────────────────
app.use(compression()); // Compress all responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ──────────────────────────────────────────────
// Static Files
// ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/academic', academicRoutes);
app.use('/api/admin/timetable', adminTimetableRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/announcements', announcementRoutes);

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ──────────────────────────────────────────────
// Protected Routes Examples
// ──────────────────────────────────────────────
app.get('/api/admin/dashboard', protect, isAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Admin Dashboard',
    user: req.user,
  });
});

app.get('/api/teacher/dashboard', protect, isTeacher, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Teacher Dashboard',
    user: req.user,
  });
});

// ──────────────────────────────────────────────
// 404 & Error Handling
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = app;
