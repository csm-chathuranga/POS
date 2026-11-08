/**
 * Force resync — deletes .last_sync and runs a full sync from scratch
 * Run: node force-resync.js
 */

const fs   = require('fs');
const path = require('path');

const stateFile = path.join(__dirname, '.last_sync');
if (fs.existsSync(stateFile)) {
  fs.unlinkSync(stateFile);
  console.log('Deleted .last_sync — will fetch from 30 days back');
} else {
  console.log('No .last_sync file found — already clean');
}

require('./sync.js');
