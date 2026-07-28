/**
 * documentController.js — Extended Enterprise Document Management (Phase 12)
 * Preserves all existing methods and adds: categories, folders, versioning,
 * metadata search, storage analytics, audit trail, download tracking.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../config/db');
const DocumentModel = require('../models/documentModel');

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/zip', 'application/x-zip-compressed',
  'text/plain', 'text/csv',
  'application/json',
];

const MAX_SIZE_BYTES = parseInt(process.env.MAX_UPLOAD_SIZE || '10485760'); // 10MB

function computeChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function virusScan(filePath) {
  console.log(`[DocumentService] Virus scan placeholder for: ${filePath}`);
  return { clean: true, engine: 'placeholder' };
}

// ─── Original methods (backward compatible) ───────────────────────────────────

exports.upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { ticketId, categoryId, description, folderPath, tags } = req.body;
    const file = req.file;

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'File type not allowed' });
    }
    if (file.size > MAX_SIZE_BYTES) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: `File exceeds max size of ${MAX_SIZE_BYTES / 1024 / 1024}MB` });
    }

    const checksum = await computeChecksum(file.path);
    const duplicate = await DocumentModel.findByChecksum(checksum);
    if (duplicate) {
      fs.unlinkSync(file.path);
      return res.status(409).json({ message: 'Duplicate file detected', existingFile: duplicate });
    }

    await virusScan(file.path);

    const tagsArray = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

    const doc = await DocumentModel.create({
      ticketId: ticketId || null,
      uploadedBy: req.user.id,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      checksum,
      categoryId: categoryId || null,
      description: description || null,
      folderPath: folderPath || '/',
      tags: tagsArray,
    });

    // Create initial version record
    await DocumentModel.createVersion({
      documentId: doc.id,
      versionNumber: 1,
      filePath: file.path,
      fileSize: file.size,
      checksum,
      uploadedBy: req.user.id,
      changeNotes: 'Initial upload',
    });

    // Audit trail
    await DocumentModel.addHistory({
      documentId: doc.id,
      action: 'uploaded',
      performedBy: req.user.id,
      details: { fileName: file.originalname, fileSize: file.size },
    });

    // Legacy ticket_attachments support
    if (ticketId) {
      await db.query(`
        INSERT INTO ticket_attachments (ticket_id, uploaded_by, file_name, file_path, file_size, mime_type)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [ticketId, req.user.id, file.originalname, file.path, file.size, file.mimetype]).catch(() => {});
    }

    res.status(201).json({ message: 'File uploaded successfully', document: doc });
  } catch (err) {
    console.error('[DocumentController] upload:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};

exports.getByTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rows } = await db.query(`
      SELECT d.*, u.name AS uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.ticket_id = $1 AND d.is_deleted = FALSE
      ORDER BY d.created_at DESC
    `, [ticketId]);
    res.json({ documents: rows });
  } catch (err) {
    console.error('[DocumentController] getByTicket:', err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

exports.download = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!fs.existsSync(doc.file_path)) return res.status(404).json({ message: 'File not found on server' });

    await DocumentModel.incrementDownload(id);
    await DocumentModel.addHistory({ documentId: id, action: 'downloaded', performedBy: req.user.id, details: null });

    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.setHeader('Content-Type', doc.mime_type);
    res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    console.error('[DocumentController] download:', err);
    res.status(500).json({ message: 'Download failed' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.uploaded_by !== req.user.id && req.user.role_name !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    await DocumentModel.softDelete(id, req.user.id);
    await DocumentModel.addHistory({ documentId: id, action: 'deleted', performedBy: req.user.id, details: null });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('[DocumentController] delete:', err);
    res.status(500).json({ message: 'Delete failed' });
  }
};

exports.replace = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No replacement file uploaded' });
    const { id } = req.params;
    const { changeNotes } = req.body;
    const file = req.file;

    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'File type not allowed' });
    }

    const oldDoc = await DocumentModel.findById(id);
    if (!oldDoc) return res.status(404).json({ message: 'Document not found' });

    const checksum = await computeChecksum(file.path);
    await virusScan(file.path);

    const newVersion = (oldDoc.version || 1) + 1;

    // Mark old version deleted
    await db.query(`UPDATE documents SET is_deleted = TRUE, replaced_by = $2 WHERE id = $1`, [id, req.user.id]);

    // Create new document record
    const newDoc = await DocumentModel.create({
      ticketId: oldDoc.ticket_id,
      uploadedBy: req.user.id,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      checksum,
      categoryId: oldDoc.category_id,
      description: oldDoc.description,
      folderPath: oldDoc.folder_path,
      tags: oldDoc.tags,
      version: newVersion,
    });

    // Add version history
    await DocumentModel.createVersion({
      documentId: newDoc.id,
      versionNumber: newVersion,
      filePath: file.path,
      fileSize: file.size,
      checksum,
      uploadedBy: req.user.id,
      changeNotes: changeNotes || `Version ${newVersion}`,
    });

    await DocumentModel.addHistory({
      documentId: newDoc.id,
      action: 'version_replaced',
      performedBy: req.user.id,
      details: { fromVersion: oldDoc.version, toVersion: newVersion },
    });

    res.json({ message: 'Document replaced successfully', document: newDoc });
  } catch (err) {
    console.error('[DocumentController] replace:', err);
    res.status(500).json({ message: 'Replace failed' });
  }
};

// ─── New Phase 12 methods ─────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const { categoryId, folderPath, search, limit = 50, offset = 0 } = req.query;
    const myOnly = req.query.myOnly === 'true';
    const uploadedBy = myOnly ? req.user.id : undefined;

    const [docs, total] = await Promise.all([
      DocumentModel.getAll({ uploadedBy, categoryId, folderPath, search, limit: parseInt(limit), offset: parseInt(offset) }),
      DocumentModel.countAll({ uploadedBy, categoryId, folderPath, search }),
    ]);

    res.json({ documents: docs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    console.error('[DocumentController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

exports.getById = async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json({ document: doc });
  } catch (err) {
    console.error('[DocumentController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.uploaded_by !== req.user.id && req.user.role_name !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const updated = await DocumentModel.update(id, req.body);
    await DocumentModel.addHistory({ documentId: id, action: 'updated', performedBy: req.user.id, details: req.body });
    res.json({ message: 'Document updated', document: updated });
  } catch (err) {
    console.error('[DocumentController] update:', err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.getVersions = async (req, res) => {
  try {
    const versions = await DocumentModel.getVersions(req.params.id);
    res.json({ versions });
  } catch (err) {
    console.error('[DocumentController] getVersions:', err);
    res.status(500).json({ message: 'Failed to fetch versions' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await DocumentModel.getHistory(req.params.id);
    res.json({ history });
  } catch (err) {
    console.error('[DocumentController] getHistory:', err);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await DocumentModel.getAllCategories();
    res.json({ categories });
  } catch (err) {
    console.error('[DocumentController] getCategories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, parentId } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const cat = await DocumentModel.createCategory({ name, description, icon, color, parentId });
    res.status(201).json({ message: 'Category created', category: cat });
  } catch (err) {
    console.error('[DocumentController] createCategory:', err);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

exports.getStorageStats = async (req, res) => {
  try {
    const [overall, byCategory] = await Promise.all([
      DocumentModel.getStorageStats(),
      DocumentModel.getStorageByCategory(),
    ]);
    res.json({ stats: overall, byCategory });
  } catch (err) {
    console.error('[DocumentController] getStorageStats:', err);
    res.status(500).json({ message: 'Failed to fetch storage stats' });
  }
};

exports.preview = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!fs.existsSync(doc.file_path)) return res.status(404).json({ message: 'File not found' });

    const previewable = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/plain'];
    if (!previewable.includes(doc.mime_type)) {
      return res.status(415).json({ message: 'Preview not supported for this file type', canDownload: true });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    console.error('[DocumentController] preview:', err);
    res.status(500).json({ message: 'Preview failed' });
  }
};
