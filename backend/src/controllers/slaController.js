const db = require('../config/db');
const slaService = require('../services/slaService');

exports.getPolicies = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM sla_policies ORDER BY resolution_time_minutes ASC`);
    res.json({ policies: result.rows });
  } catch (err) {
    console.error('[SLA Controller] Error getting policies:', err);
    res.status(500).json({ message: 'Server error fetching SLA policies' });
  }
};

exports.updatePolicy = async (req, res) => {
  const { id } = req.params;
  const { response_time_minutes, resolution_time_minutes, is_active } = req.body;

  try {
    const result = await db.query(
      `UPDATE sla_policies 
       SET response_time_minutes = $1, 
           resolution_time_minutes = $2, 
           is_active = $3, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [response_time_minutes, resolution_time_minutes, is_active, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Policy not found' });
    }

    // Refresh service cache
    await slaService.refreshPolicies();

    res.json({ message: 'Policy updated successfully', policy: result.rows[0] });
  } catch (err) {
    console.error('[SLA Controller] Error updating policy:', err);
    res.status(500).json({ message: 'Server error updating policy' });
  }
};
