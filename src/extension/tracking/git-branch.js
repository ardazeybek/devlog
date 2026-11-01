"use strict";
// Reads the checked-out branch from .git/HEAD, with a short cache to avoid repeated reads.
const fs = require("node:fs");
const path = require("node:path");
const CACHE_MS = 60000;
const cache = new Map();
const UNKNOWN = "no branch";

// Parses the branch name from the contents of a HEAD file.
function parseHead(text) {
  const match = /^ref: refs\/heads\/(.+)$/m.exec(text);
  return match ? match[1].trim() : "detached";
}

// Returns the branch name for a workspace folder, or a placeholder when unknown.
function branchOf(folderPath, now = Date.now()) {
  const hit = cache.get(folderPath);
  if (hit && now - hit.at < CACHE_MS) return hit.name;
  let name = UNKNOWN;
  try {
    name = parseHead(
      fs.readFileSync(path.join(folderPath, ".git", "HEAD"), "utf8"),
    );
  } catch {}
  cache.set(folderPath, { name, at: now });
  return name;
}
module.exports = { branchOf, parseHead, UNKNOWN };
