require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const connectDatabase = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const postRoutes = require('./routes/post.routes');
const pageRoutes = require('./routes/page.routes');
const mediaRoutes = require('./routes/media.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const publicCategoryRoutes = require('./routes/public/category.routes');
const publicPostRoutes = require('./routes/public/post.routes');
const publicPageRoutes = require('./routes/public/page.routes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDatabase();

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
}));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiLimiter);

// Static files (for uploaded media)
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/posts', postRoutes);
app.use('/api/admin/pages', pageRoutes);
app.use('/api/admin/media', mediaRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/categories', publicCategoryRoutes);
app.use('/api/posts', publicPostRoutes);
app.use('/api/pages', publicPageRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🚀 Server started on http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    console.error('UNHANDLED REJECTION! Shutting down...');
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    process.exit(1);
});

module.exports = app;
