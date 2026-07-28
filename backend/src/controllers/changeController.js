/**
 * changeController.js — ITIL Change Management Controller (Phase 14)
 */
const ChangeModel = require('../models/changeModel');

exports.getAll = async (req, res) => {
  try {
    const { status, changeType, search, limit = 50, offset = 0 } = req.query;
    const [changes, total] = await Promise.all([
      ChangeModel.getAll({ status, changeType, search, limit: parseInt(limit), offset: parseInt(offset) }),
      ChangeModel.count({ status, changeType, search }),
    ]);
    res.json({ changes, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[ChangeController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch change requests' });
  }
};

exports.getById = async (req, res) => {
  try {
    const change = await ChangeModel.findById(req.params.id);
    if (!change) return res.status(404).json({ message: 'Change request not found' });
    const [tasks, approvals, history] = await Promise.all([
      ChangeModel.getTasks(change.id),
      ChangeModel.getApprovals(change.id),
      ChangeModel.getHistory(change.id),
    ]);
    res.json({ change, tasks, approvals, history });
  } catch (err) {
    console.error('[ChangeController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch change request' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, changeType, priority, riskLevel, riskAssessment,
            implementationPlan, rollbackPlan, businessJustification, assignedTo,
            cabRequired, plannedStart, plannedEnd, ticketId } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required' });

    const change = await ChangeModel.create({
      title, description, changeType, priority, riskLevel, riskAssessment,
      implementationPlan, rollbackPlan, businessJustification,
      requestedBy: req.user.id, assignedTo, cabRequired, plannedStart, plannedEnd, ticketId,
    });
    await ChangeModel.addHistory({ changeId: change.id, action: 'created', performedBy: req.user.id, newValue: 'Draft' });
    res.status(201).json({ message: 'Change request created', change });
  } catch (err) {
    console.error('[ChangeController] create:', err);
    res.status(500).json({ message: 'Failed to create change request' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const change = await ChangeModel.findById(id);
    if (!change) return res.status(404).json({ message: 'Change request not found' });

    const oldStatus = change.status;
    const updated = await ChangeModel.update(id, req.body);

    if (req.body.status && req.body.status !== oldStatus) {
      await ChangeModel.addHistory({
        changeId: id, action: 'status_changed',
        performedBy: req.user.id, oldValue: oldStatus, newValue: req.body.status,
      });
    } else {
      await ChangeModel.addHistory({ changeId: id, action: 'updated', performedBy: req.user.id });
    }
    res.json({ message: 'Change request updated', change: updated });
  } catch (err) {
    console.error('[ChangeController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, sequenceOrder, estimatedHours } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });
    const task = await ChangeModel.createTask({ changeId: req.params.id, title, description, assignedTo, sequenceOrder, estimatedHours });
    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    console.error('[ChangeController] createTask:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await ChangeModel.updateTask(req.params.taskId, req.body);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Task updated', task });
  } catch (err) {
    console.error('[ChangeController] updateTask:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

exports.addApprover = async (req, res) => {
  try {
    const { approverId, sequenceOrder } = req.body;
    if (!approverId) return res.status(400).json({ message: 'approverId is required' });
    const approval = await ChangeModel.addApprover({ changeId: req.params.id, approverId, sequenceOrder });
    res.status(201).json({ message: 'Approver added', approval });
  } catch (err) {
    console.error('[ChangeController] addApprover:', err);
    res.status(500).json({ message: 'Failed to add approver' });
  }
};

exports.submitApproval = async (req, res) => {
  try {
    const { status, comments } = req.body;
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }
    const result = await ChangeModel.submitApproval({
      approvalId: req.params.approvalId,
      approverId: req.user.id,
      status, comments,
    });
    if (!result) return res.status(404).json({ message: 'Approval record not found or not your approval' });

    await ChangeModel.addHistory({
      changeId: req.params.id, action: `approval_${status.toLowerCase()}`,
      performedBy: req.user.id, newValue: status,
    });
    res.json({ message: `Change ${status.toLowerCase()}`, approval: result });
  } catch (err) {
    console.error('[ChangeController] submitApproval:', err);
    res.status(500).json({ message: 'Approval failed' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await ChangeModel.getStats();
    res.json({ stats });
  } catch (err) {
    console.error('[ChangeController] getStats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};
