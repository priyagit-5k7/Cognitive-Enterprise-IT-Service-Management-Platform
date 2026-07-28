/**
 * knowledgeBaseService.js
 * Searches the knowledge base to find resolution suggestions for a given ticket.
 * Uses TF-IDF-inspired keyword overlap scoring against seeded KB articles.
 */

const db = require('../config/db');

/**
 * Search knowledge base for relevant articles.
 * Returns top 3 articles sorted by relevance.
 *
 * @param {string} title
 * @param {string} description
 * @param {string} category - Predicted category from classificationService
 * @returns {Promise<Array<{ title: string, solution: string, score: number }>>}
 */
async function searchKnowledgeBase(title, description, category) {
  try {
    const text = `${title} ${description}`.toLowerCase();

    // Fetch all KB articles (small table, fine to load in memory)
    const result = await db.query(`SELECT id, title, problem, solution, keywords, category FROM knowledge_base`);
    const articles = result.rows;

    if (!articles.length) return [];

    // Score each article by keyword overlap
    const scored = articles.map(article => {
      const keywords = article.keywords || [];
      const matchedKeywords = keywords.filter(kw => text.includes(kw.toLowerCase()));

      // Bonus score if category matches
      const categoryBonus = article.category === category ? 3 : 0;

      // Compute overlap ratio
      const titleWords = article.title.toLowerCase().split(/\s+/);
      const titleOverlap = titleWords.filter(w => text.includes(w) && w.length > 3).length;

      const totalScore = matchedKeywords.length + categoryBonus + (titleOverlap * 0.5);

      return {
        id: article.id,
        title: article.title,
        solution: article.solution,
        category: article.category,
        score: totalScore,
        matchedKeywords: matchedKeywords.length
      };
    });

    // Filter articles with at least 1 keyword match or same category
    const relevant = scored
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return relevant;
  } catch (err) {
    console.error('Knowledge base search error:', err.message);
    return [];
  }
}

/**
 * Extract the primary suggested resolution from top KB results.
 * @param {Array} kbResults
 * @returns {string}
 */
function buildSuggestedResolution(kbResults) {
  if (!kbResults || kbResults.length === 0) {
    return 'No automated resolution found. Please consult the IT support team for manual investigation.';
  }

  const top = kbResults[0];
  return `Based on similar cases: ${top.solution}`;
}

/**
 * Estimate resolution time based on priority and category.
 * @param {string} priority
 * @param {string} category
 * @returns {string}
 */
function estimateResolutionTime(priority, category) {
  const baseTime = {
    'Critical': '2-4 hours',
    'High': '4-8 hours',
    'Medium': '1-2 business days',
    'Low': '3-5 business days'
  };

  // Hardware issues take longer due to physical involvement
  const hardwareOverride = {
    'Critical': '4-8 hours',
    'High': '1 business day',
    'Medium': '2-3 business days',
    'Low': '5-7 business days'
  };

  if (category === 'Hardware Support') {
    return hardwareOverride[priority] || '1-2 business days';
  }

  return baseTime[priority] || '1-2 business days';
}

module.exports = { searchKnowledgeBase, buildSuggestedResolution, estimateResolutionTime };
