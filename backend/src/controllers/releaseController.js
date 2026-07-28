/**
 * releaseController.js — Release Management Controller (Phase 16)
 */
const ReleaseModel = require('../models/releaseModel');

exports.getAll = async (req, res) => {
  try {
    const { status, releaseType, environment, search, limit = 50, offset = 0 } = req.query;
    const [releases, total] = await Promise.all([
      ReleaseModel.getAll({ status, releaseType, environment, search, limit: parseInt(limit), offset: parseInt(offset) }),
      ReleaseModel.count({ status, releaseType, search }),
    ]);
    res.json({ releases, total });
  } catch (err) {
    console.error('[ReleaseController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch releases' });
  }
};

exports.getById = async (req, res) => {
  try {
    const release = await ReleaseModel.findById(req.params.id);
    if (!release) return res.status(404).json({ message: 'Release not found' });
    const [tasks, history] = await Promise.all([
      ReleaseModel.getTasks(release.id),
      ReleaseModel.getHistory(release.id),
    ]);
    res.json({ release, tasks, history });
  } catch (err) {
    console.error('[ReleaseController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch release' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, version } = req.body;
    if (!title || !version) return res.status(400).json({ message: 'Title and version are required' });
    const release = await ReleaseModel.create({ ...req.body, createdBy: req.user.id });
    await ReleaseModel.addHistory({ releaseId: release.id, action: 'created', performedBy: req.user.id });
    res.status(201).json({ message: 'Release created', release });
  } catch (err) {
    console.error('[ReleaseController] create:', err);
    res.status(500).json({ message: 'Failed to create release' });
  }
};

exports.update = async (req, res) => {
  try {
    const release = await ReleaseModel.findById(req.params.id);
    if (!release) return res.status(404).json({ message: 'Release not found' });
    const updated = await ReleaseModel.update(req.params.id, req.body);
    await ReleaseModel.addHistory({ releaseId: req.params.id, action: `updated_${req.body.status || 'details'}`, performedBy: req.user.id });
    res.json({ message: 'Release updated', release: updated });
  } catch (err) {
    console.error('[ReleaseController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const task = await ReleaseModel.createTask({ releaseId: req.params.id, ...req.body });
    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    console.error('[ReleaseController] createTask:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await ReleaseModel.updateTask(req.params.taskId, req.body);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task updated', task });
  } catch (err) {
    console.error('[ReleaseController] updateTask:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await ReleaseModel.getStats();
    res.json({ stats });
  } catch (err) {
    console.error('[ReleaseController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
