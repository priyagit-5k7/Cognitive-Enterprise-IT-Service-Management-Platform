/**
 * aiOrchestrator.js
 * Central orchestrator that combines classification, prioritization,
 * knowledge base search, and engineer recommendation to generate
 * a complete AI prediction for a ticket.
 *
 * All AI results are stored in the ai_predictions table.
 */

const db = require('../config/db');
const { classifyTicket } = require('./classificationService');
const { predictPriority } = require('./prioritizationService');
const { searchKnowledgeBase, buildSuggestedResolution, estimateResolutionTime } = require('./knowledgeBaseService');
const { recommendEngineer, findSimilarTickets } = require('./engineerRecommendationService');

const aiGatewayService = require('../services/aiGatewayService');

/**
 * Run full AI analysis pipeline on a newly created ticket.
 * Stores result in ai_predictions table.
 *
 * @param {Object} ticket - { id, title, description, type, created_by }
 * @returns {Promise<Object>} - The AI prediction record
 */
async function analyzeTicket(ticket) {
  const { id: ticketId, title, description, type, created_by } = ticket;
  const combinedText = `${title} ${description}`;

  try {
    // Phase 24: Deep Learning Classification
    const dlClassification = await aiGatewayService.predictCategory(combinedText);
    const predictedCategory = dlClassification ? dlClassification.predicted_category : classifyTicket(title, description).category;
    const classificationConfidence = dlClassification ? dlClassification.confidence : 0.5;

    // Phase 25: ML Priority Prediction
    const mlPriority = await aiGatewayService.predictPriority({ title, description, department: predictedCategory });
    const predictedPriority = mlPriority ? mlPriority.predicted_priority : predictPriority(title, description, type).priority;
    
    // Confidence merging
    const confidence = Math.round((classificationConfidence + (mlPriority ? mlPriority.confidence : 0.5)) * 50);

    // Phase 28 & 29: RAG and Semantic Search for KB/Resolution
    const ragResponse = await aiGatewayService.ragGenerate(title, description);
    const suggestedResolution = ragResponse ? ragResponse.generated_response : 'Please review manually.';
    const estimatedResolutionTime = mlPriority ? \`\${mlPriority.estimated_resolution_time_hrs} hours\` : 'Unknown';

    // Phase 26: AI Engineer Recommendation
    const routingResult = await aiGatewayService.recommendEngineer({ ticket_id: ticketId, description });
    const recommendedEngineerId = null; // Could map routingResult.best_engineer.id to PG UUID if it existed

    // 7. Find similar tickets (Phase 28 vector search)
    const semanticResult = await aiGatewayService.semanticSearch(combinedText);
    const similarTickets = semanticResult ? semanticResult.results : [];

    // 8. Store prediction in database (upsert)
    const result = await db.query(
      `INSERT INTO ai_predictions (
        ticket_id, predicted_category, predicted_priority, confidence,
        suggested_resolution, estimated_resolution_time,
        recommended_engineer, similar_tickets
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (ticket_id) DO UPDATE SET
        predicted_category = EXCLUDED.predicted_category,
        predicted_priority = EXCLUDED.predicted_priority,
        confidence = EXCLUDED.confidence,
        suggested_resolution = EXCLUDED.suggested_resolution,
        estimated_resolution_time = EXCLUDED.estimated_resolution_time,
        recommended_engineer = EXCLUDED.recommended_engineer,
        similar_tickets = EXCLUDED.similar_tickets
      RETURNING *`,
      [
        ticketId,
        predictedCategory,
        predictedPriority,
        confidence,
        suggestedResolution,
        estimatedResolutionTime,
        recommendedEngineerId,
        JSON.stringify(similarTickets)
      ]
    );

    const prediction = result.rows[0];

    return {
      ...prediction,
      dlMetadata: {
        category_model: dlClassification?.model,
        priority_model: mlPriority?.model,
        routing_model: routingResult?.model
      }
    };
  } catch (err) {
    console.error(`AI analysis failed for ticket ${ticketId}:`, err.message);
    // Return a minimal fallback prediction (non-blocking)
    return {
      ticket_id: ticketId,
      predicted_category: 'General Request',
      predicted_priority: 'Medium',
      confidence: 0,
      suggested_resolution: 'AI analysis encountered an error. Please review manually.',
      estimated_resolution_time: '1-2 business days',
      recommended_engineer: null,
      similar_tickets: [],
      error: err.message
    };
  }
}

/**
 * Retrieve stored AI prediction for a ticket.
 * @param {string} ticketId
 * @returns {Promise<Object|null>}
 */
async function getPrediction(ticketId) {
  try {
    const result = await db.query(
      `SELECT ap.*,
        u.name AS recommended_engineer_name,
        u.email AS recommended_engineer_email
      FROM ai_predictions ap
      LEFT JOIN users u ON ap.recommended_engineer = u.id
      WHERE ap.ticket_id = $1`,
      [ticketId]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error(`Failed to retrieve AI prediction for ticket ${ticketId}:`, err.message);
    return null;
  }
}

/**
 * Re-analyze an existing ticket (e.g., when title/description is updated).
 * @param {Object} ticket
 * @returns {Promise<Object>}
 */
async function reAnalyzeTicket(ticket) {
  return analyzeTicket(ticket);
}

/**
 * Get AI analytics summary (admin/manager use).
 * @returns {Promise<Object>}
 */
async function getAiAnalyticsSummary() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) AS total_predictions,
        AVG(confidence) AS avg_confidence,
        predicted_category,
        predicted_priority,
        COUNT(*) OVER (PARTITION BY predicted_category) AS category_count
      FROM ai_predictions
      GROUP BY predicted_category, predicted_priority
      ORDER BY predicted_category, predicted_priority
    `);

    const byCategory = {};
    const byPriority = {};

    result.rows.forEach(row => {
      byCategory[row.predicted_category] = (byCategory[row.predicted_category] || 0) + parseInt(row.count, 10);
      byPriority[row.predicted_priority] = (byPriority[row.predicted_priority] || 0) + parseInt(row.count, 10);
    });

    return { byCategory, byPriority };
  } catch (err) {
    console.error('AI analytics summary error:', err.message);
    return { byCategory: {}, byPriority: {} };
  }
}

module.exports = { analyzeTicket, getPrediction, reAnalyzeTicket, getAiAnalyticsSummary };
