/**
 * emailQueue.js
 * Async email queue — ensures emails never block API requests.
 * Uses an in-memory queue processed via setImmediate.
 * Includes retry logic (up to 3 attempts) and centralized logging.
 */

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.concurrency = 3; // max parallel sends
    this.activeJobs = 0;
    this.log = [];       // centralized event log (last 500 entries)
    this.maxLogSize = 500;
  }

  /**
   * Enqueue an email job.
   * @param {Function} sendFn - Async function that performs the actual send
   * @param {string} label    - Human-readable label for logging
   * @param {string} to       - Recipient email (for logging)
   */
  enqueue(sendFn, label, to) {
    const job = { sendFn, label, to, attempts: 0, maxAttempts: 3, enqueuedAt: new Date() };
    this.queue.push(job);
    this._addLog('QUEUED', label, to);
    setImmediate(() => this._processQueue());
  }

  async _processQueue() {
    if (this.activeJobs >= this.concurrency || this.queue.length === 0) return;

    const job = this.queue.shift();
    this.activeJobs++;

    try {
      job.attempts++;
      await job.sendFn();
      this._addLog('SENT', job.label, job.to, `Attempt ${job.attempts}`);
    } catch (err) {
      const errMsg = err.message || 'Unknown error';
      this._addLog('ERROR', job.label, job.to, `Attempt ${job.attempts}: ${errMsg}`);

      if (job.attempts < job.maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, job.attempts - 1) * 1000;
        setTimeout(() => {
          this.queue.unshift(job);
          this._processQueue();
        }, delay);
      } else {
        this._addLog('FAILED', job.label, job.to, `Max attempts (${job.maxAttempts}) reached. Dropping.`);
      }
    } finally {
      this.activeJobs--;
      // Continue draining
      if (this.queue.length > 0) {
        setImmediate(() => this._processQueue());
      }
    }
  }

  _addLog(status, label, to, detail = '') {
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      label,
      to,
      detail
    };

    // Console output
    const icon = { QUEUED: '📬', SENT: '✅', ERROR: '⚠️', FAILED: '❌' }[status] || '•';
    console.log(`[EmailQueue] ${icon} ${status} | ${label} → ${to}${detail ? ' | ' + detail : ''}`);

    // Persist to in-memory log
    this.log.unshift(entry);
    if (this.log.length > this.maxLogSize) {
      this.log.pop();
    }
  }

  /**
   * Returns the last N log entries for admin inspection.
   */
  getLog(limit = 100) {
    return this.log.slice(0, limit);
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      totalLogged: this.log.length
    };
  }
}

module.exports = new EmailQueue();
