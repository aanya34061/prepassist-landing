/**
 * UPSC News Scheduler
 *
 * Runs the daily news updater at 10:30 AM IST every day.
 *
 * Usage:
 *   node scripts/scheduler.js
 *
 * Keep this process running (use pm2, systemd, or similar):
 *   pm2 start scripts/scheduler.js --name upsc-news-scheduler
 */

const cron = require('node-cron');
const { runDailyUpdate } = require('./daily-news-updater');

// ── 8:00 AM IST = 02:30 UTC ──────────────────────────────────────────────
// Cron format: minute hour day month weekday
// IST is UTC+5:30, so 8:00 AM IST = 02:30 AM UTC
const CRON_SCHEDULE = '30 2 * * *';

console.log('═══════════════════════════════════════════════════');
console.log('🕐 UPSC News Scheduler Started');
console.log(`📅 Schedule: Daily at 8:00 AM IST (${CRON_SCHEDULE} UTC)`);
console.log(`🚀 Started at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
console.log('═══════════════════════════════════════════════════\n');
console.log('Waiting for next scheduled run...\n');

// Schedule the job
const job = cron.schedule(CRON_SCHEDULE, async () => {
  console.log(`\n🔔 Triggered at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n`);

  try {
    const result = await runDailyUpdate();

    if (result.success) {
      console.log(`✅ Scheduled update completed: ${result.inserted} articles added\n`);
    } else {
      console.error(`❌ Scheduled update failed: ${result.error}\n`);
    }
  } catch (err) {
    console.error('❌ Unexpected error during scheduled run:', err.message);
  }
}, {
  timezone: 'Asia/Kolkata',
});

job.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Scheduler stopped');
  job.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Scheduler terminated');
  job.stop();
  process.exit(0);
});
