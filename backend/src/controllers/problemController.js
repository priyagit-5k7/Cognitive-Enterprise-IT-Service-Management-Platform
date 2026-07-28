/**
 * problemController.js — Problem Management Controller (Phase 15)
 */
const ProblemModel = require('../models/problemModel');

exports.getAll = async (req, res) => {
  try {
    const { status, priority, search, limit = 50, offset = 0 } = req.query;
    const [problems, total] = await Promise.all([
      ProblemModel.getAll({ status, priority, search, limit: parseInt(limit), offset: parseInt(offset) }),
      ProblemModel.count({ status, priority, search }),
    ]);
    res.json({ problems, total });
  } catch (err) {
    console.error('[ProblemController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch problems' });
  }
};

exports.getById = async (req, res) => {
  try {
    const problem = await ProblemModel.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const [knownErrors, linkedIncidents, history] = await Promise.all([
      ProblemModel.getKnownErrors(problem.id),
      ProblemModel.getLinkedIncidents(problem.id),
      ProblemModel.getHistory(problem.id),
    ]);
    res.json({ problem, knownErrors, linkedIncidents, history });
  } catch (err) {
    console.error('[ProblemController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch problem' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required' });
    const problem = await ProblemModel.create({ ...req.body, reportedBy: req.user.id });
    await ProblemModel.addHistory({ problemId: problem.id, action: 'created', performedBy: req.user.id });
    res.status(201).json({ message: 'Problem created', problem });
  } catch (err) {
    console.error('[ProblemController] create:', err);
    res.status(500).json({ message: 'Failed to create problem' });
  }
};

exports.update = async (req, res) => {
  try {
    const problem = await ProblemModel.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const updated = await ProblemModel.update(req.params.id, req.body);
    await ProblemModel.addHistory({ problemId: req.params.id, action: 'updated', performedBy: req.user.id, details: req.body.status });
    res.json({ message: 'Problem updated', problem: updated });
  } catch (err) {
    console.error('[ProblemController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.createKnownError = async (req, res) => {
  try {
    const { title, description, workaround, affectedServices } = req.body;
    if (!title || !description || !workaround) return res.status(400).json({ message: 'Title, description, and workaround are required' });
    const ke = await ProblemModel.createKnownError({ problemId: req.params.id, title, description, workaround, affectedServices, createdBy: req.user.id });
    await ProblemModel.update(req.params.id, { status: 'Known Error' });
    res.status(201).json({ message: 'Known error created', knownError: ke });
  } catch (err) {
    console.error('[ProblemController] createKnownError:', err);
    res.status(500).json({ message: 'Failed to create known error' });
  }
};

exports.getKnownErrors = async (req, res) => {
  try {
    const errors = await ProblemModel.getKnownErrors();
    res.json({ knownErrors: errors });
  } catch (err) {
    console.error('[ProblemController] getKnownErrors:', err);
    res.status(500).json({ message: 'Failed to fetch known errors' });
  }
};

exports.linkIncident = async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'ticketId is required' });
    const result = await ProblemModel.linkIncident({ problemId: req.params.id, ticketId, linkedBy: req.user.id });
    res.json({ message: result ? 'Incident linked' : 'Already linked' });
  } catch (err) {
    console.error('[ProblemController] linkIncident:', err);
    res.status(500).json({ message: 'Failed to link incident' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [stats, knownErrors] = await Promise.all([
      ProblemModel.getStats(),
      ProblemModel.getKnownErrors(),
    ]);
    res.json({ stats, recentKnownErrors: knownErrors.slice(0, 5) });
  } catch (err) {
    console.error('[ProblemController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
