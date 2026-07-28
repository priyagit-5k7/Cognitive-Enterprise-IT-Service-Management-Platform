/**
 * knowledgeController.js — Knowledge Base CRUD API (Phase 9)
 */

const KnowledgeModel = require('../models/knowledgeModel');

exports.getAll = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const result = await KnowledgeModel.findAll({
      search, category,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
    res.json(result);
  } catch (err) {
    console.error('[KnowledgeController] getAll:', err);
    res.status(500).json({ message: 'Failed to fetch knowledge base articles' });
  }
};

exports.getById = async (req, res) => {
  try {
    const article = await KnowledgeModel.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    // Track view
    KnowledgeModel.incrementViewCount(req.params.id).catch(() => {});
    res.json({ article });
  } catch (err) {
    console.error('[KnowledgeController] getById:', err);
    res.status(500).json({ message: 'Failed to fetch article' });
  }
};

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    const results = await KnowledgeModel.fullTextSearch(q.trim(), 15);
    res.json({ results, count: results.length });
  } catch (err) {
    console.error('[KnowledgeController] search:', err);
    res.status(500).json({ message: 'Search failed' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await KnowledgeModel.getCategories();
    res.json({ categories });
  } catch (err) {
    console.error('[KnowledgeController] getCategories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, category, problem, solution, keywords, tags } = req.body;
    if (!title || !category || !problem || !solution) {
      return res.status(400).json({ message: 'title, category, problem, and solution are required' });
    }
    const article = await KnowledgeModel.create({
      title: title.trim(),
      category: category.trim(),
      problem: problem.trim(),
      solution: solution.trim(),
      keywords: Array.isArray(keywords) ? keywords : [],
      tags: Array.isArray(tags) ? tags : [],
      createdBy: req.user.id
    });
    res.status(201).json({ message: 'Article created successfully', article });
  } catch (err) {
    console.error('[KnowledgeController] create:', err);
    res.status(500).json({ message: 'Failed to create article' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, category, problem, solution, keywords, tags } = req.body;
    const article = await KnowledgeModel.update(req.params.id, {
      title, category, problem, solution,
      keywords: Array.isArray(keywords) ? keywords : undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      updatedBy: req.user.id
    });
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article updated successfully', article });
  } catch (err) {
    console.error('[KnowledgeController] update:', err);
    res.status(500).json({ message: 'Failed to update article' });
  }
};

exports.approve = async (req, res) => {
  try {
    const article = await KnowledgeModel.approve(req.params.id, req.user.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article approved', article });
  } catch (err) {
    console.error('[KnowledgeController] approve:', err);
    res.status(500).json({ message: 'Failed to approve article' });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await KnowledgeModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    console.error('[KnowledgeController] remove:', err);
    res.status(500).json({ message: 'Failed to delete article' });
  }
};
