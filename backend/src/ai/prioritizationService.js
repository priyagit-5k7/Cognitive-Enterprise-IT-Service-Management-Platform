/**
 * prioritizationService.js
 * Rule-based priority predictor for incoming support tickets.
 * Uses keyword urgency scoring and ticket type to determine priority.
 */

// Urgency keyword sets by priority level
const PRIORITY_RULES = [
  {
    priority: 'Critical',
    keywords: [
      'critical', 'emergency', 'down', 'outage', 'disaster', 'data loss',
      'security breach', 'hack', 'compromised', 'ransomware', 'all users',
      'entire company', 'production down', 'server down', 'system failure',
      'cannot work at all', 'complete failure', 'business critical', 'urgent escalation',
      'regulatory', 'gdpr', 'legal', 'compliance breach', 'fire', 'flooding'
    ],
    score: 4
  },
  {
    priority: 'High',
    keywords: [
      'urgent', 'asap', 'immediate', 'immediately', 'not working', 'broken',
      'blocked', 'cannot access', 'unable to login', 'deadline', 'high impact',
      'multiple users', 'several users', 'team affected', 'department down',
      'service degraded', 'major issue', 'important', 'critical system',
      'cannot send email', 'vpn not connecting', 'payment', 'transaction'
    ],
    score: 3
  },
  {
    priority: 'Medium',
    keywords: [
      'slow', 'intermittent', 'sometimes', 'occasionally', 'problem',
      'error', 'issue', 'not working properly', 'reduced performance',
      'partially working', 'workaround', 'need help', 'please help',
      'having trouble', 'difficulty', 'concern', 'unexpected', 'crash'
    ],
    score: 2
  },
  {
    priority: 'Low',
    keywords: [
      'question', 'inquiry', 'request', 'would like', 'when possible',
      'no rush', 'low priority', 'minor', 'suggestion', 'feature request',
      'feedback', 'improvement', 'guidance', 'advice', 'documentation',
      'training', 'how to', 'tutorial', 'information', 'update me'
    ],
    score: 1
  }
];

// Type multipliers: Incidents are inherently more urgent
const TYPE_WEIGHTS = {
  'Incident': 1.2,
  'Problem': 1.0,
  'Service Request': 0.8,
  'Change Request': 0.7
};

/**
 * Predict priority for a ticket.
 *
 * @param {string} title
 * @param {string} description
 * @param {string} ticketType  - Incident | Problem | Service Request | Change Request
 * @returns {{ priority: string, confidence: number }}
 */
function predictPriority(title, description, ticketType = 'Incident') {
  const text = `${title} ${description}`.toLowerCase();
  const typeMultiplier = TYPE_WEIGHTS[ticketType] || 1.0;

  // Score each rule
  const scores = PRIORITY_RULES.map(rule => {
    const matched = rule.keywords.filter(kw => text.includes(kw.toLowerCase()));
    const rawScore = matched.length * rule.score * typeMultiplier;
    return { priority: rule.priority, score: rawScore, matched: matched.length };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  // Default low priority if no strong signals
  if (best.score === 0) {
    return { priority: 'Low', confidence: 55 };
  }

  const dominance = totalScore > 0 ? best.score / totalScore : 0;
  const baseConfidence = Math.round(50 + dominance * 45);
  const matchBoost = Math.min(10, best.matched * 3);
  const confidence = Math.min(96, baseConfidence + matchBoost);

  return {
    priority: best.priority,
    confidence,
    matchedKeywords: best.matched
  };
}

module.exports = { predictPriority, PRIORITY_RULES };
