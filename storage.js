'use strict';
const fs = require('node:fs');
const path = require('node:path');
const COUNTERS = ['seconds', 'typed', 'added', 'removed', 'bulk', 'edits', 'manualSeconds'];
function emptyDay() {
  return { seconds: 0, typed: 0, added: 0, removed: 0, bulk: 0, edits: 0,
    manualSeconds: 0, projects: Object.create(null), languages: Object.create(null) };
}
function positive(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0; }
function aggregate(root) {
  const days = Object.create(null);
  let unreadableFiles = 0;
  for (const file of fs.readdirSync(root).filter(name => name.endsWith('.json')).sort()) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      if (record.version !== 1 || !record.days || typeof record.days !== 'object') continue;
      for (const [date, row] of Object.entries(record.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !row || typeof row !== 'object') continue;
        const day = days[date] ??= emptyDay();
        for (const counter of COUNTERS) day[counter] += positive(row[counter]);
        for (const field of ['projects', 'languages']) {
          if (!row[field] || typeof row[field] !== 'object') continue;
          for (const [key, value] of Object.entries(row[field])) {
            const amount = positive(value);
            if (amount > 0) day[field][key] = (day[field][key] || 0) + amount;
          }
        }
      }
    } catch { unreadableFiles++; }
  }
  return { days, unreadableFiles };
}
function atomicWrite(file, value) {
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temporary, file);
}
module.exports = { emptyDay, aggregate, atomicWrite, positive };
