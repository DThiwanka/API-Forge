import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import { securityHeaders } from './config/security.js';
import routes from './routes/index.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

// Security and CORS
app.use(securityHeaders);
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// 404 & Error handlers
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
