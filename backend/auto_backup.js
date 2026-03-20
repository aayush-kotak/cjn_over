/**
 * PLACE IN: backend/
 * This runs automatically every day at 11 PM and backs up your database
 * ADD TO server.js: require('./auto_backup');
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH     = path.join(__dirname, 'db', 'cjn.db');
const BACKUP_DIR  = path.join(__dirname, 'db', 'backups');

// Create backup folder if missing
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function runBackup() {
  try {
    const today    = new Date().toISOString().slice(0, 10);
    const backupPath = path.join(BACKUP_DIR, `cjn_backup_${today}.db`);

    // Copy db file
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);

    // Keep only last 30 backups — delete older ones
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('cjn_backup_') && f.endsWith('.db'))
      .sort();

    if (files.length > 30) {
      const toDelete = files.slice(0, files.length - 30);
      toDelete.forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        console.log(`🗑️  Deleted old backup: ${f}`);
      });
    }
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
  }
}

// Run backup once immediately on server start
runBackup();

// Then run every day at 11 PM
function scheduleDaily() {
  const now    = new Date();
  const target = new Date();
  target.setHours(23, 0, 0, 0); // 11:00 PM

  // If 11 PM already passed today, schedule for tomorrow
  if (now > target) target.setDate(target.getDate() + 1);

  const msUntilBackup = target - now;
  console.log(`⏰ Next backup scheduled in ${Math.round(msUntilBackup / 3600000)} hours`);

  setTimeout(() => {
    runBackup();
    setInterval(runBackup, 24 * 60 * 60 * 1000); // repeat every 24h
  }, msUntilBackup);
}

scheduleDaily();

module.exports = { runBackup };