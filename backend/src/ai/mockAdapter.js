/**
 * mockAdapter.js — Mock LLM Adapter (Phase 19)
 * Default provider — requires no API key.
 * Returns realistic AI responses for development and testing.
 */

const resolutions = [
  `**Recommended Resolution Steps:**\n\n1. **Verify the Issue**: Reproduce the problem to understand its scope and impact.\n2. **Check Recent Changes**: Review any system changes in the last 24-48 hours.\n3. **Review Logs**: Examine application and system logs for error patterns.\n4. **Apply Known Fix**: If a similar issue was resolved before, apply the documented workaround.\n5. **Test the Fix**: Verify the issue is resolved in a controlled environment.\n6. **Document the Resolution**: Update the knowledge base with findings.\n7. **Monitor**: Keep the system under observation for 30 minutes post-fix.\n\n*Confidence: 87% | Based on similar tickets resolved in the past 30 days.*`,
  `**Analysis & Resolution Plan:**\n\n1. **Isolate the Problem**: Determine if the issue is isolated or system-wide.\n2. **Collect Diagnostics**: Run diagnostic scripts and capture output.\n3. **Cross-Reference KB**: Check the Knowledge Base for matching issues.\n4. **Escalate if Needed**: If no known fix, escalate to Tier 2 support.\n5. **Apply Patch**: Install available updates or patches.\n6. **Verify Resolution**: Confirm with the end user that the issue is resolved.\n\n*Estimated resolution time: 2-4 hours*`,
  `**Root Cause Analysis:**\n\nBased on the provided information, the most likely root causes are:\n\n• **Primary**: Configuration drift causing service inconsistency\n• **Secondary**: Missing dependency or version mismatch\n• **Tertiary**: Resource exhaustion (memory/disk/CPU)\n\n**Immediate Actions:**\n1. Restart affected services\n2. Check resource utilization\n3. Verify configuration files against baseline\n4. Apply hotfix if available\n\n*Confidence Score: 82%*`,
];

const summaries = [
  'User is experiencing connectivity issues with the corporate network, likely due to VPN configuration problems. The issue started after a recent software update and affects multiple users.',
  'Hardware failure detected on workstation. The system fails to boot and displays a blue screen error. Suspected RAM or storage device failure requiring immediate hardware inspection.',
  'Software application crashes repeatedly after the latest OS update. Multiple users affected. Rollback of the update or application patch required as immediate mitigation.',
];

const mockAdapter = {
  async chat(messages, options = {}) {
    // Simulate realistic AI processing delay
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

    const lastMessage = messages[messages.length - 1]?.content || '';
    let content;

    if (lastMessage.toLowerCase().includes('summarize') || lastMessage.toLowerCase().includes('summary')) {
      content = summaries[Math.floor(Math.random() * summaries.length)];
    } else if (lastMessage.toLowerCase().includes('root cause')) {
      content = resolutions[2];
    } else if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
      content = "Hello! I'm your AI support assistant. I can help you with ticket resolution, knowledge base queries, root cause analysis, and IT support guidance. How can I assist you today?";
    } else if (lastMessage.toLowerCase().includes('ticket')) {
      content = resolutions[Math.floor(Math.random() * 2)];
    } else {
      content = resolutions[Math.floor(Math.random() * resolutions.length)];
    }

    return {
      content,
      usage: { tokens: Math.floor(100 + Math.random() * 400) },
      provider: 'mock',
      model: 'smart-support-mock-v1',
    };
  },

  async embed(text) {
    // Return a deterministic mock embedding vector (384 dimensions)
    await new Promise(r => setTimeout(r, 50));
    const seed = text.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return Array.from({ length: 384 }, (_, i) => Math.sin(seed + i) * 0.5);
  },
};

module.exports = mockAdapter;
