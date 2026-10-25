import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env, root } from './config/env.js';
import { mutationGuard } from './middleware/security.js';
import router from './routes/index.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  }));
  app.use(cors({
    origin: new URL(env.CLIENT_URL).origin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-CSRF-Token']
  }));
  app.use(compression());
  app.use(express.json({
    limit: '100kb'
  }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  app.get('/api/v1/health', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    success: mongoose.connection.readyState === 1,
    data: {
      service: 'DevOrbia API',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable'
    }
  }));
  app.use('/api/v1', rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again shortly.'
      }
    }
  }), (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  }, mutationGuard, router);
  app.use('/api', (_req, res) => res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'API endpoint not found.'
    }
  }));
  const client = path.join(root, 'client', 'dist');
  if (existsSync(path.join(client, 'index.html'))) {
    app.use(express.static(client, {
      index: false,
      maxAge: '1h'
    }));
    app.get(/.*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(client, 'index.html'));
    });
  }
  app.use((error, req, res, _next) => {
    if (res.headersSent) return;
    let status = error.status || 500,
      code = error.code || 'INTERNAL_ERROR',
      message = error.message,
      details;
    if (error instanceof ZodError) {
      status = 422;
      code = 'VALIDATION_ERROR';
      message = 'Please check the highlighted fields.';
      details = error.issues.map(x => ({
        field: x.path.join('.'),
        message: x.message
      }));
    }
    if (error.code === 11000) {
      status = 409;
      code = 'DUPLICATE_RECORD';
      message = 'A record with these unique details already exists.';
    }
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      status = 422;
      code = 'INVALID_RECORD';
      message = 'The submitted record is invalid.';
    }
    if (error.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'The request body is not valid JSON.';
    }
    if (error.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'The request exceeds the size limit.';
    }
    if (status >= 500) {
      console.error(JSON.stringify({
        requestId: req.requestId,
        event: 'request_failed',
        code: String(code),
        type: error.name
      }));
      message = 'Something went wrong. Please try again.';
      code = 'INTERNAL_ERROR';
    }
    res.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        requestId: req.requestId
      }
    });
  });
  return app;
}
