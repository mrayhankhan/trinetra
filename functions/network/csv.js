"use strict";

// Tiny dependency-free CSV loader used by the mock Data Store. Handles quoted
// fields (e.g. `ipc_sections` = "IPC 457, 380") and a trailing newline.

const fs = require("fs");
const path = require("path");

function parseLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const header = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row = {};
    header.forEach((h, i) => (row[h] = cells[i]));
    return row;
  });
}

function defaultDir() {
  if (process.env.AGENT_DATA_DIR) return process.env.AGENT_DATA_DIR;
  // Prefer CSVs bundled alongside the function (present after deploy);
  // fall back to the repo's data/out for local runs.
  const local = path.join(__dirname, "data");
  if (fs.existsSync(local)) return local;
  return path.resolve(__dirname, "..", "..", "data", "out");
}

const cache = {};

function loadTable(name, dir) {
  const d = dir || defaultDir();
  const key = d + "::" + name;
  if (cache[key]) return cache[key];
  const file = path.join(d, name + ".csv");
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  cache[key] = rows;
  return rows;
}

module.exports = { loadTable, parseCsv, defaultDir };
