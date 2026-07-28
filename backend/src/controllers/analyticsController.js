/**
 * analyticsController.js — REST endpoints for analytics (Phase 8)
 */

const analyticsService = require('../services/analyticsService');

// Helper: extract date filters from query
const parseDates = (query) => ({
  startDate: query.startDate || null,
  endDate: query.endDate || null
});

exports.getOverview = async (req, res) => {
  try {
    const data = await analyticsService.getOverview(parseDates(req.query));
    res.json(data);
  } catch (err) {
    console.error('[Analytics] getOverview:', err);
    res.status(500).json({ message: 'Failed to load analytics overview' });
  }
};

exports.getTicketsByStatus = async (req, res) => {
  try {
    const data = await analyticsService.getTicketsByStatus(parseDates(req.query));
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getTicketsByStatus:', err);
    res.status(500).json({ message: 'Failed to load status breakdown' });
  }
};

exports.getTicketsByPriority = async (req, res) => {
  try {
    const data = await analyticsService.getTicketsByPriority(parseDates(req.query));
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getTicketsByPriority:', err);
    res.status(500).json({ message: 'Failed to load priority breakdown' });
  }
};

exports.getTicketsByCategory = async (req, res) => {
  try {
    const data = await analyticsService.getTicketsByCategory(parseDates(req.query));
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getTicketsByCategory:', err);
    res.status(500).json({ message: 'Failed to load category breakdown' });
  }
};

exports.getEngineerPerformance = async (req, res) => {
  try {
    const data = await analyticsService.getEngineerPerformance(parseDates(req.query));
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getEngineerPerformance:', err);
    res.status(500).json({ message: 'Failed to load engineer performance' });
  }
};

exports.getMonthlyTrends = async (req, res) => {
  try {
    const months = parseInt(req.query.months, 10) || 12;
    const data = await analyticsService.getMonthlyTrends({ months });
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getMonthlyTrends:', err);
    res.status(500).json({ message: 'Failed to load monthly trends' });
  }
};

exports.getWeeklyTrends = async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks, 10) || 12;
    const data = await analyticsService.getWeeklyTrends({ weeks });
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getWeeklyTrends:', err);
    res.status(500).json({ message: 'Failed to load weekly trends' });
  }
};

exports.getSlaCompliance = async (req, res) => {
  try {
    const data = await analyticsService.getSlaCompliance(parseDates(req.query));
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getSlaCompliance:', err);
    res.status(500).json({ message: 'Failed to load SLA compliance' });
  }
};

exports.getSupportWorkload = async (req, res) => {
  try {
    const data = await analyticsService.getSupportWorkload();
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getSupportWorkload:', err);
    res.status(500).json({ message: 'Failed to load workload data' });
  }
};

exports.getAiAccuracy = async (req, res) => {
  try {
    const data = await analyticsService.getAiPredictionAccuracy();
    res.json({ data });
  } catch (err) {
    console.error('[Analytics] getAiAccuracy:', err);
    res.status(500).json({ message: 'Failed to load AI accuracy data' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const { type = 'tickets', format = 'json' } = req.query;
    const data = await analyticsService.getExportData(type, parseDates(req.query));

    if (format === 'csv') {
      if (!data.length) return res.json({ message: 'No data to export' });
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      data.forEach(row => {
        csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
      return res.send(csvRows.join('\n'));
    }

    res.json({ data, count: data.length, type });
  } catch (err) {
    console.error('[Analytics] exportData:', err);
    res.status(500).json({ message: 'Export failed' });
  }
};
