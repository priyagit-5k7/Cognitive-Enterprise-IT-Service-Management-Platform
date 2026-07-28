/**
 * assetModel.js — Enterprise Asset Management Model (Phase 13)
 */
const db = require('../config/db');

const AssetModel = {
  async getAll({ status, categoryId, assignedTo, search, limit = 50, offset = 0 } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`a.status = $${i++}`); params.push(status); }
    if (categoryId) { where.push(`a.category_id = $${i++}`); params.push(categoryId); }
    if (assignedTo) { where.push(`a.assigned_to = $${i++}`); params.push(assignedTo); }
    if (search) {
      where.push(`(a.name ILIKE $${i} OR a.asset_tag ILIKE $${i} OR a.serial_number ILIKE $${i} OR a.model ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    params.push(limit, offset);
    const { rows } = await db.query(`
      SELECT a.*, ac.name AS category_name, ac.icon AS category_icon,
             u.name AS assigned_to_name, v.name AS vendor_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN vendors v ON a.vendor_id = v.id
      WHERE ${where.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT $${i++} OFFSET $${i}
    `, params);
    return rows;
  },

  async count({ status, categoryId, assignedTo, search } = {}) {
    let where = ['1=1'];
    const params = [];
    let i = 1;
    if (status) { where.push(`a.status = $${i++}`); params.push(status); }
    if (categoryId) { where.push(`a.category_id = $${i++}`); params.push(categoryId); }
    if (assignedTo) { where.push(`a.assigned_to = $${i++}`); params.push(assignedTo); }
    if (search) {
      where.push(`(a.name ILIKE $${i} OR a.asset_tag ILIKE $${i} OR a.serial_number ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }
    const { rows } = await db.query(`SELECT COUNT(*) FROM assets a WHERE ${where.join(' AND ')}`, params);
    return parseInt(rows[0].count);
  },

  async findById(id) {
    const { rows } = await db.query(`
      SELECT a.*, ac.name AS category_name, ac.icon AS category_icon,
             u.name AS assigned_to_name, u.email AS assigned_to_email,
             v.name AS vendor_name, v.contact_email AS vendor_email,
             cb.name AS created_by_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      LEFT JOIN users u ON a.assigned_to = u.id
      LEFT JOIN vendors v ON a.vendor_id = v.id
      LEFT JOIN users cb ON a.created_by = cb.id
      WHERE a.id = $1
    `, [id]);
    return rows[0] || null;
  },

  async findByTag(assetTag) {
    const { rows } = await db.query(`SELECT * FROM assets WHERE asset_tag = $1`, [assetTag]);
    return rows[0] || null;
  },

  async generateAssetTag() {
    const { rows } = await db.query(`SELECT COUNT(*) FROM assets`);
    const num = parseInt(rows[0].count) + 1;
    return `AST-${String(num).padStart(6, '0')}`;
  },

  async create(data) {
    const { rows } = await db.query(`
      INSERT INTO assets (
        asset_tag, name, description, category_id, vendor_id, status, condition,
        serial_number, model, manufacturer, purchase_date, purchase_cost,
        warranty_expiry, depreciation_rate, current_value, location,
        ip_address, mac_address, os_type, os_version, notes, qr_code, barcode, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *
    `, [
      data.assetTag, data.name, data.description || null, data.categoryId || null, data.vendorId || null,
      data.status || 'Available', data.condition || 'Good', data.serialNumber || null,
      data.model || null, data.manufacturer || null, data.purchaseDate || null,
      data.purchaseCost || null, data.warrantyExpiry || null, data.depreciationRate || 0,
      data.currentValue || data.purchaseCost || null, data.location || null,
      data.ipAddress || null, data.macAddress || null, data.osType || null,
      data.osVersion || null, data.notes || null,
      data.qrCode || null, data.barcode || null, data.createdBy,
    ]);
    return rows[0];
  },

  async update(id, data) {
    const fields = [];
    const params = [];
    let i = 1;
    const allowed = ['name','description','category_id','vendor_id','status','condition','serial_number',
      'model','manufacturer','purchase_date','purchase_cost','warranty_expiry','depreciation_rate',
      'current_value','location','ip_address','mac_address','os_type','os_version','notes','qr_code','barcode'];
    const mapping = {
      categoryId: 'category_id', vendorId: 'vendor_id', serialNumber: 'serial_number',
      purchaseDate: 'purchase_date', purchaseCost: 'purchase_cost', warrantyExpiry: 'warranty_expiry',
      depreciationRate: 'depreciation_rate', currentValue: 'current_value', ipAddress: 'ip_address',
      macAddress: 'mac_address', osType: 'os_type', osVersion: 'os_version', qrCode: 'qr_code',
    };
    for (const [key, col] of Object.entries(mapping)) {
      if (data[key] !== undefined) { fields.push(`${col} = $${i++}`); params.push(data[key]); }
    }
    for (const col of allowed) {
      if (data[col] !== undefined) { fields.push(`${col} = $${i++}`); params.push(data[col]); }
    }
    if (!fields.length) return null;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const { rows } = await db.query(`UPDATE assets SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, params);
    return rows[0] || null;
  },

  async assign({ assetId, assignedTo, assignedBy, notes }) {
    await db.query(`UPDATE asset_assignments SET is_active = FALSE WHERE asset_id = $1 AND is_active = TRUE`, [assetId]);
    const { rows } = await db.query(`
      INSERT INTO asset_assignments (asset_id, assigned_to, assigned_by, notes)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [assetId, assignedTo, assignedBy, notes || null]);
    await db.query(`UPDATE assets SET assigned_to = $1, assigned_at = CURRENT_TIMESTAMP, status = 'In Use', updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [assignedTo, assetId]);
    return rows[0];
  },

  async returnAsset({ assetId, returnCondition, notes, returnedBy }) {
    await db.query(`
      UPDATE asset_assignments SET is_active = FALSE, returned_at = CURRENT_TIMESTAMP, return_condition = $2, notes = $3
      WHERE asset_id = $1 AND is_active = TRUE
    `, [assetId, returnCondition || 'Good', notes || null]);
    await db.query(`UPDATE assets SET assigned_to = NULL, assigned_at = NULL, status = 'Available', condition = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [assetId, returnCondition || 'Good']);
  },

  async addHistory({ assetId, action, performedBy, details }) {
    const { rows } = await db.query(`
      INSERT INTO asset_history (asset_id, action, performed_by, details)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [assetId, action, performedBy, details ? JSON.stringify(details) : null]);
    return rows[0];
  },

  async getHistory(assetId) {
    const { rows } = await db.query(`
      SELECT ah.*, u.name AS performed_by_name
      FROM asset_history ah
      LEFT JOIN users u ON ah.performed_by = u.id
      WHERE ah.asset_id = $1
      ORDER BY ah.created_at DESC
    `, [assetId]);
    return rows;
  },

  async getAssignments(assetId) {
    const { rows } = await db.query(`
      SELECT aa.*, u.name AS assigned_to_name, u.email AS assigned_to_email,
             ab.name AS assigned_by_name
      FROM asset_assignments aa
      LEFT JOIN users u ON aa.assigned_to = u.id
      LEFT JOIN users ab ON aa.assigned_by = ab.id
      WHERE aa.asset_id = $1
      ORDER BY aa.assigned_at DESC
    `, [assetId]);
    return rows;
  },

  async getCategories() {
    const { rows } = await db.query(`SELECT * FROM asset_categories ORDER BY name`);
    return rows;
  },

  // Vendor methods
  async getAllVendors(search) {
    const params = search ? [`%${search}%`] : [];
    const where = search ? `WHERE name ILIKE $1 OR contact_email ILIKE $1` : ``;
    const { rows } = await db.query(`SELECT * FROM vendors ${where} ORDER BY name`, params);
    return rows;
  },

  async createVendor(data) {
    const { rows } = await db.query(`
      INSERT INTO vendors (name, contact_name, contact_email, contact_phone, website, address, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [data.name, data.contactName || null, data.contactEmail || null, data.contactPhone || null, data.website || null, data.address || null, data.notes || null]);
    return rows[0];
  },

  async updateVendor(id, data) {
    const { rows } = await db.query(`
      UPDATE vendors SET name=$1, contact_name=$2, contact_email=$3, contact_phone=$4, website=$5, address=$6, notes=$7, updated_at=CURRENT_TIMESTAMP
      WHERE id=$8 RETURNING *
    `, [data.name, data.contactName || null, data.contactEmail || null, data.contactPhone || null, data.website || null, data.address || null, data.notes || null, id]);
    return rows[0] || null;
  },

  // Stats
  async getStats() {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) AS total_assets,
        COUNT(*) FILTER (WHERE status='Available') AS available,
        COUNT(*) FILTER (WHERE status='In Use') AS in_use,
        COUNT(*) FILTER (WHERE status='Maintenance') AS maintenance,
        COUNT(*) FILTER (WHERE status='Retired') AS retired,
        COUNT(*) FILTER (WHERE warranty_expiry < CURRENT_DATE AND warranty_expiry IS NOT NULL) AS warranty_expired,
        COALESCE(SUM(purchase_cost), 0) AS total_purchase_cost,
        COALESCE(SUM(current_value), 0) AS total_current_value
      FROM assets
    `);
    return rows[0];
  },

  async getStatsByCategory() {
    const { rows } = await db.query(`
      SELECT ac.name, ac.icon, COUNT(a.id) AS count,
             COUNT(a.id) FILTER (WHERE a.status='Available') AS available
      FROM asset_categories ac
      LEFT JOIN assets a ON a.category_id = ac.id
      GROUP BY ac.id, ac.name, ac.icon
      ORDER BY count DESC
    `);
    return rows;
  },
};

module.exports = AssetModel;
