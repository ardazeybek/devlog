"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
function testFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? testFiles(file)
        : entry.name.endsWith(".test.js")
          ? [file]
          : [];
    })
    .sort();
}
const files = testFiles(path.join(__dirname, "..", "test"));
const result = spawnSync(
  process.execPath,
  ["--experimental-vm-modules", "--test", ...files],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
