const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Phase 1-11 routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const aiRoutes = require('./routes/aiRoutes');
const slaRoutes = require('./routes/slaRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const searchRoutes = require('./routes/searchRoutes');
const documentRoutes = require('./routes/documentRoutes');

// Phase 12-23 routes
const assetRoutes = require('./routes/assetRoutes');           // Phase 13
const changeRoutes = require('./routes/changeRoutes');         // Phase 14
const problemRoutes = require('./routes/problemRoutes');       // Phase 15
const releaseRoutes = require('./routes/releaseRoutes');       // Phase 16
const cmdbRoutes = require('./routes/cmdbRoutes');             // Phase 17
const workflowRoutes = require('./routes/workflowRoutes');     // Phase 18
const aiPlatformRoutes = require('./routes/aiPlatformRoutes'); // Phase 19
const devopsRoutes = require('./routes/devopsRoutes');         // Phase 20
const securityRoutes = require('./routes/securityRoutes');     // Phase 22
const monitoringRoutes = require('./routes/monitoringRoutes'); // Phase 23
const enterpriseAiRoutes = require('./routes/enterpriseAiRoutes'); // Phases 24-40

// Services
const AuditService = require('./services/auditService');

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // In production, replace with specific domain(s)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Audit Middleware (Phase 22) — non-blocking, placed after JSON parsing
app.use(AuditService.middleware);

// API Routes (Phase 1-11 — unchanged)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/sla', slaRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);     // Phase 8
app.use('/api/v1/knowledge', knowledgeRoutes);      // Phase 9
app.use('/api/v1/search', searchRoutes);            // Phase 11
app.use('/api/v1/documents', documentRoutes);       // Phase 12

// API Routes (Phase 13-23)
app.use('/api/v1/assets', assetRoutes);             // Phase 13
app.use('/api/v1/changes', changeRoutes);           // Phase 14
app.use('/api/v1/problems', problemRoutes);         // Phase 15
app.use('/api/v1/releases', releaseRoutes);         // Phase 16
app.use('/api/v1/cmdb', cmdbRoutes);                // Phase 17
app.use('/api/v1/workflows', workflowRoutes);       // Phase 18
app.use('/api/v1/ai-platform', aiPlatformRoutes);  // Phase 19
app.use('/api/v1/devops', devopsRoutes);            // Phase 20
app.use('/api/v1/security', securityRoutes);        // Phase 22
app.use('/api/v1/monitoring', monitoringRoutes);    // Phase 23
app.use('/api/v1/enterprise-ai', enterpriseAiRoutes); // Phases 24-40

// Static file serving for uploads
const path = require('path');
app.use('/uploads', require('express').static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
