/**
 * assetController.js — Enterprise Asset Management Controller (Phase 13)
 */
const AssetModel = require('../models/assetModel');

exports.getAll = async (req, res) => {
  try {
    const { status, categoryId, assignedTo, search, limit = 50, offset = 0 } = req.query;
    const [assets, total] = await Promise.all([
      AssetModel.getAll({ status, categoryId, assignedTo, search, limit: parseInt(limit), offset: parseInt(offset) }),
      AssetModel.count({ status, categoryId, assignedTo, search }),
    ]);
    res.json({ assets, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[AssetController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch assets' });
  }
};

exports.getById = async (req, res) => {
  try {
    const asset = await AssetModel.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json({ asset });
  } catch (err) {
    console.error('[AssetController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch asset' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, categoryId, vendorId, status, condition, serialNumber, model, manufacturer,
            purchaseDate, purchaseCost, warrantyExpiry, depreciationRate, currentValue,
            location, ipAddress, macAddress, osType, osVersion, notes, description } = req.body;

    if (!name) return res.status(400).json({ message: 'Asset name is required' });

    const assetTag = await AssetModel.generateAssetTag();
    const asset = await AssetModel.create({
      assetTag, name, description, categoryId, vendorId, status, condition, serialNumber,
      model, manufacturer, purchaseDate, purchaseCost, warrantyExpiry, depreciationRate,
      currentValue, location, ipAddress, macAddress, osType, osVersion, notes,
      createdBy: req.user.id,
    });

    await AssetModel.addHistory({ assetId: asset.id, action: 'created', performedBy: req.user.id, details: { name, assetTag } });
    res.status(201).json({ message: 'Asset created', asset });
  } catch (err) {
    console.error('[AssetController] create:', err);
    res.status(500).json({ message: 'Failed to create asset' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await AssetModel.findById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    const updated = await AssetModel.update(id, req.body);
    await AssetModel.addHistory({ assetId: id, action: 'updated', performedBy: req.user.id, details: req.body });
    res.json({ message: 'Asset updated', asset: updated });
  } catch (err) {
    console.error('[AssetController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.assign = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, notes } = req.body;
    if (!assignedTo) return res.status(400).json({ message: 'assignedTo is required' });
    const asset = await AssetModel.findById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    if (asset.status === 'Retired') return res.status(400).json({ message: 'Cannot assign a retired asset' });

    const assignment = await AssetModel.assign({ assetId: id, assignedTo, assignedBy: req.user.id, notes });
    await AssetModel.addHistory({ assetId: id, action: 'assigned', performedBy: req.user.id, details: { assignedTo, notes } });
    res.json({ message: 'Asset assigned', assignment });
  } catch (err) {
    console.error('[AssetController] assign:', err);
    res.status(500).json({ message: 'Assignment failed' });
  }
};

exports.returnAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { returnCondition, notes } = req.body;
    const asset = await AssetModel.findById(id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    if (asset.status !== 'In Use') return res.status(400).json({ message: 'Asset is not currently assigned' });

    await AssetModel.returnAsset({ assetId: id, returnCondition, notes, returnedBy: req.user.id });
    await AssetModel.addHistory({ assetId: id, action: 'returned', performedBy: req.user.id, details: { returnCondition, notes } });
    res.json({ message: 'Asset returned successfully' });
  } catch (err) {
    console.error('[AssetController] return:', err);
    res.status(500).json({ message: 'Return failed' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await AssetModel.getHistory(req.params.id);
    res.json({ history });
  } catch (err) {
    console.error('[AssetController] getHistory:', err);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const assignments = await AssetModel.getAssignments(req.params.id);
    res.json({ assignments });
  } catch (err) {
    console.error('[AssetController] getAssignments:', err);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await AssetModel.getCategories();
    res.json({ categories });
  } catch (err) {
    console.error('[AssetController] getCategories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [stats, byCategory] = await Promise.all([
      AssetModel.getStats(),
      AssetModel.getStatsByCategory(),
    ]);
    res.json({ stats, byCategory });
  } catch (err) {
    console.error('[AssetController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// Vendors
exports.getVendors = async (req, res) => {
  try {
    const vendors = await AssetModel.getAllVendors(req.query.search);
    res.json({ vendors });
  } catch (err) {
    console.error('[AssetController] getVendors:', err);
    res.status(500).json({ message: 'Failed to fetch vendors' });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Vendor name is required' });
    const vendor = await AssetModel.createVendor(req.body);
    res.status(201).json({ message: 'Vendor created', vendor });
  } catch (err) {
    console.error('[AssetController] createVendor:', err);
    res.status(500).json({ message: 'Failed to create vendor' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await AssetModel.updateVendor(req.params.id, req.body);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ message: 'Vendor updated', vendor });
  } catch (err) {
    console.error('[AssetController] updateVendor:', err);
    res.status(500).json({ message: 'Failed to update vendor' });
  }
};
