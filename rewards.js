'use strict';
const fs = require('node:fs');
const path = require('node:path');
const rules = require('./web/achievements');
const { atomicWrite } = require('./storage');
function earned(days) {
  const achievements = rules.evaluate(days).filter(item => item.earned).map(item => ({
    id: 'achievement:' + item.id, kind: 'achievement', name: item.name, description: item.description, points: item.points
  }));
  const titles = rules.titles(days).titles.filter(item => item.earned && item.xp > 0).map(item => ({
    id: 'title:' + item.id, kind: 'title', name: item.name, description: 'You earned a new title.', points: 0
  }));
  return [...titles, ...achievements];
}
class RewardTracker {
  constructor(root, days) {
    this.file = path.join(root, '.reward-notifications');
    this.lock = this.file + '.lock';
    this.events = [];
    // An upgrade starts with today's existing rewards, without replaying years of badges.
    this.poll(days, true);
  }
  recent() {
    try { const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (saved.version === 1 && Array.isArray(saved.events)) return saved.events.filter(event => typeof event?.id === 'string' && typeof event.name === 'string' && ['title', 'achievement'].includes(event.kind)).slice(-64);
    } catch {}
    return this.events;
  }
  poll(days, initialize = false) {
    const rewards = earned(days);
    let handle;
    try {
      try { handle = fs.openSync(this.lock, 'wx', 0o600); }
      catch (error) {
        if (error.code === 'EEXIST' && Date.now() - fs.statSync(this.lock).mtimeMs > 30000) fs.unlinkSync(this.lock);
        return [];
      }
      let saved;
      try { saved = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch {}
      const valid = saved?.version === 1 && Array.isArray(saved.seen);
      const seen = new Set(valid ? saved.seen.filter(id => typeof id === 'string') : []);
      const fresh = valid && !initialize ? rewards.filter(item => !seen.has(item.id)) : [];
      rewards.forEach(item => seen.add(item.id));
      const events = fresh.map(item => ({ ...item, earnedAt: Date.now() }));
      const previous = Array.isArray(saved?.events) ? saved.events.filter(event => typeof event?.id === 'string' && typeof event.name === 'string' && ['title', 'achievement'].includes(event.kind)) : [];
      this.events = [...previous, ...events].slice(-64);
      if (!valid || fresh.length || initialize) atomicWrite(this.file, { version: 1, seen: [...seen], events: this.events });
      return events;
    } catch { return []; } // A notification must never interrupt time tracking.
    finally {
      if (handle !== undefined) { fs.closeSync(handle); try { fs.unlinkSync(this.lock); } catch {} }
    }
  }
}
module.exports = { earned, RewardTracker };
