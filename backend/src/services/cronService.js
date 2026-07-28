const cron = require('node-cron');
const slaService = require('./slaService');

class CronService {
  start() {
    console.log('[Cron Service] Starting background jobs...');

    // SLA Breach Checker - Runs every 1 minute
    cron.schedule('* * * * *', async () => {
      // console.log('[Cron Service] Checking for SLA breaches...');
      await slaService.checkSlaBreaches();
    });
  }
}

module.exports = new CronService();
