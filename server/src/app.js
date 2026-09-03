const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/error.middleware');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

// Body Parser & Cookie Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// API Routes
app.use('/api/v1/health', healthRoutes);
const authRoutes = require('./routes/auth.routes');
app.use('/api/v1/auth', authRoutes);

// Catch 404
app.use((req, res, next) => {
  const error = new Error(`Route Not Found: ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
