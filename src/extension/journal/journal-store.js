"use strict";
// Stores short coding notes in their own file, separate from version-1 activity records.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { atomicWrite } = require("../storage/activity-store");
const FILE = "journal.json";
const MAX_NOTES = 1000;
const MAX_TEXT = 500;

// Reads saved notes, treating a missing or damaged file as empty.
function readNotes(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data.version === 2 && Array.isArray(data.notes)) return data.notes;
  } catch {}
  return [];
}

// Checks one note payload and returns a clean copy, or null when invalid.
function cleanNote(input) {
  const text = typeof input?.text === "string" ? input.text.trim() : "";
  const date = input?.date;
  const project =
    typeof input?.project === "string" ? input.project.trim() : "";
  if (!text || text.length > MAX_TEXT || project.length > 200) return null;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return null;
  return { date, project, text };
}

// Creates the journal store for one storage folder.
function createJournalStore(root) {
  const file = path.join(root, FILE);

  // Returns every saved note, newest first.
  function list() {
    return readNotes(file);
  }

  // Adds a validated note and returns it, or null when the payload is invalid.
  function add(input) {
    const clean = cleanNote(input);
    if (!clean) return null;
    const note = { id: crypto.randomUUID(), ...clean, createdAt: Date.now() };
    atomicWrite(file, {
      version: 2,
      notes: [note, ...list()].slice(0, MAX_NOTES),
    });
    return note;
  }

  // Removes one note by ID and tells whether it existed.
  function remove(id) {
    const notes = list();
    const next = notes.filter((note) => note.id !== id);
    if (next.length === notes.length) return false;
    atomicWrite(file, { version: 2, notes: next });
    return true;
  }
  return { list, add, remove };
}
module.exports = { createJournalStore };
