/**
 * cmdbController.js — CMDB Controller (Phase 17)
 */
const CmdbModel = require('../models/cmdbModel');

exports.getAll = async (req, res) => {
  try {
    const { type, status, environment, search, limit = 50, offset = 0 } = req.query;
    const [items, total] = await Promise.all([
      CmdbModel.getAll({ type, status, environment, search, limit: parseInt(limit), offset: parseInt(offset) }),
      CmdbModel.count({ type, status, search }),
    ]);
    res.json({ items, total });
  } catch (err) {
    console.error('[CmdbController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch CIs' });
  }
};

exports.getById = async (req, res) => {
  try {
    const ci = await CmdbModel.findById(req.params.id);
    if (!ci) return res.status(404).json({ message: 'CI not found' });
    const [relationships, history] = await Promise.all([
      CmdbModel.getRelationships(ci.id),
      CmdbModel.getHistory(ci.id),
    ]);
    res.json({ ci, relationships, history });
  } catch (err) {
    console.error('[CmdbController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch CI' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ message: 'Name and type are required' });
    const ci = await CmdbModel.create(req.body);
    await CmdbModel.addHistory({ ciId: ci.id, action: 'created', performedBy: req.user.id, newValue: ci });
    res.status(201).json({ message: 'CI created', ci });
  } catch (err) {
    console.error('[CmdbController] create:', err);
    res.status(500).json({ message: 'Failed to create CI' });
  }
};

exports.update = async (req, res) => {
  try {
    const ci = await CmdbModel.findById(req.params.id);
    if (!ci) return res.status(404).json({ message: 'CI not found' });
    const updated = await CmdbModel.update(req.params.id, req.body);
    await CmdbModel.addHistory({ ciId: req.params.id, action: 'updated', performedBy: req.user.id, oldValue: ci, newValue: updated });
    res.json({ message: 'CI updated', ci: updated });
  } catch (err) {
    console.error('[CmdbController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.addRelationship = async (req, res) => {
  try {
    const { targetCiId, relationshipType, description } = req.body;
    if (!targetCiId) return res.status(400).json({ message: 'targetCiId is required' });
    const rel = await CmdbModel.addRelationship({ sourceCiId: req.params.id, targetCiId, relationshipType, description, createdBy: req.user.id });
    res.status(201).json({ message: rel ? 'Relationship added' : 'Relationship already exists', relationship: rel });
  } catch (err) {
    console.error('[CmdbController] addRelationship:', err);
    res.status(500).json({ message: 'Failed to add relationship' });
  }
};

exports.removeRelationship = async (req, res) => {
  try {
    await CmdbModel.removeRelationship(req.params.relId);
    res.json({ message: 'Relationship removed' });
  } catch (err) {
    console.error('[CmdbController] removeRelationship:', err);
    res.status(500).json({ message: 'Failed to remove relationship' });
  }
};

exports.getImpactAnalysis = async (req, res) => {
  try {
    const affected = await CmdbModel.getImpactAnalysis(req.params.id);
    res.json({ affected, count: affected.length });
  } catch (err) {
    console.error('[CmdbController] getImpactAnalysis:', err);
    res.status(500).json({ message: 'Failed to run impact analysis' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [stats, typeDistribution] = await Promise.all([
      CmdbModel.getStats(),
      CmdbModel.getTypeDistribution(),
    ]);
    res.json({ stats, typeDistribution });
  } catch (err) {
    console.error('[CmdbController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
