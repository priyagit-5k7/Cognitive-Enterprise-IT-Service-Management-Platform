/**
 * classificationService.js
 * Rule-based ticket category classifier using keyword scoring.
 * Designed to be swappable with an ML model in future phases.
 */

// Category keyword map: each category has weighted keyword sets
const CATEGORY_RULES = [
  {
    category: 'Hardware Support',
    keywords: [
      'laptop', 'computer', 'pc', 'desktop', 'monitor', 'screen', 'keyboard',
      'mouse', 'printer', 'printer', 'hardware', 'device', 'battery', 'charger',
      'power', 'ram', 'memory', 'hard drive', 'ssd', 'hdd', 'usb', 'port',
      'headphone', 'webcam', 'cable', 'docking', 'speaker', 'slow computer',
      'not turning on', 'black screen', 'overheating', 'fan', 'boot'
    ],
    weight: 1.0
  },
  {
    category: 'Software Issues',
    keywords: [
      'software', 'application', 'app', 'program', 'install', 'uninstall',
      'crash', 'error', 'bug', 'freeze', 'update', 'upgrade', 'license',
      'activation', 'antivirus', 'windows', 'macos', 'linux', 'office',
      'excel', 'word', 'outlook', 'browser', 'chrome', 'firefox', 'edge',
      'adobe', 'zoom', 'teams', 'slack', 'driver', 'code', 'programming',
      'os', 'operating system', 'blue screen', 'bsod', 'registry', 'virus',
      'malware', 'ransomware', 'slow application', 'corrupted', 'not responding'
    ],
    weight: 1.0
  },
  {
    category: 'Network & Internet',
    keywords: [
      'network', 'internet', 'wifi', 'wireless', 'ethernet', 'cable',
      'connection', 'connect', 'disconnect', 'vpn', 'firewall', 'router',
      'switch', 'ip address', 'dns', 'dhcp', 'bandwidth', 'latency', 'ping',
      'timeout', 'slow internet', 'no internet', 'offline', 'remote access',
      'lan', 'wan', 'proxy', 'ssl', 'certificate', 'port forwarding',
      'network drive', 'shared folder', 'cannot access', 'connectivity'
    ],
    weight: 1.0
  },
  {
    category: 'Account & Access',
    keywords: [
      'password', 'login', 'logout', 'account', 'user', 'access', 'permission',
      'authentication', 'mfa', '2fa', 'two-factor', 'sso', 'ldap', 'active directory',
      'reset', 'forgot', 'locked', 'expired', 'credentials', 'authorize',
      'unauthorized', 'forbidden', 'sign in', 'sign up', 'register',
      'onboarding', 'new account', 'disable account', 'enable account',
      'privilege', 'role', 'group policy', 'domain'
    ],
    weight: 1.0
  },
  {
    category: 'General Request',
    keywords: [
      'request', 'inquiry', 'question', 'information', 'help', 'support',
      'general', 'other', 'misc', 'miscellaneous', 'onboarding', 'training',
      'documentation', 'procedure', 'policy', 'how to', 'what is', 'guidance',
      'advice', 'feedback', 'suggestion', 'improvement', 'feature', 'report'
    ],
    weight: 0.6
  }
];

/**
 * Classify a ticket based on its title and description.
 * Returns the predicted category and a 0-100 confidence score.
 *
 * @param {string} title
 * @param {string} description
 * @returns {{ category: string, confidence: number }}
 */
function classifyTicket(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const scores = CATEGORY_RULES.map(rule => {
    const matchedKeywords = rule.keywords.filter(kw => text.includes(kw.toLowerCase()));
    const rawScore = matchedKeywords.length * rule.weight;
    return { category: rule.category, score: rawScore, matched: matchedKeywords.length };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (best.score === 0) {
    return { category: 'General Request', confidence: 45 };
  }

  // Confidence = how dominant the top category is vs. the runner-up
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const dominanceRatio = totalScore > 0 ? best.score / totalScore : 0;
  const rawConfidence = Math.min(95, Math.round(50 + dominanceRatio * 50));

  // Boost confidence if many keywords matched
  const matchBoost = Math.min(10, best.matched * 2);
  const confidence = Math.min(98, rawConfidence + matchBoost);

  return {
    category: best.category,
    confidence,
    matchedKeywords: best.matched
  };
}

module.exports = { classifyTicket, CATEGORY_RULES };
