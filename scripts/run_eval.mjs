import fs from "node:fs";
import { detectLocal } from "../src/detection/engine.ts";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/run_eval.mjs <csv>");
  process.exit(1);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines.shift() || "");
const textIndex = header.indexOf("text");
const expectedIndex = header.indexOf("expected");
if (textIndex < 0 || expectedIndex < 0) {
  console.error("CSV header must include text,expected");
  process.exit(1);
}

const rows = lines.map((line) => {
  const values = parseCsvLine(line);
  return { text: values[textIndex], expected: values[expectedIndex].trim() };
});

const missesTs = [];
const missesPy = [];
const falsePositiveTs = [];
const falsePositivePy = [];
const differences = [];
let backendAvailable = true;

for (const row of rows) {
  const ts = detectLocal(row.text);
  let py = null;
  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: row.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    py = await response.json();
  } catch {
    backendAvailable = false;
  }

  if (ts.verdict !== row.expected) {
    missesTs.push({ text: row.text, expected: row.expected, got: ts.verdict, score: ts.score });
  }
  if (row.expected === "safe" && ts.verdict !== "safe") {
    falsePositiveTs.push({ text: row.text, got: ts.verdict, score: ts.score });
  }
  if (py) {
    if (py.verdict !== row.expected) {
      missesPy.push({ text: row.text, expected: row.expected, got: py.verdict, score: py.score });
    }
    if (row.expected === "safe" && py.verdict !== "safe") {
      falsePositivePy.push({ text: row.text, got: py.verdict, score: py.score });
    }
    if (ts.verdict !== py.verdict || ts.score !== py.score) {
      differences.push({ text: row.text, ts, py });
    }
  }
}

const accuracy = (rows.length - missesTs.length) / rows.length * 100;
console.log(JSON.stringify({
  rows: rows.length,
  ts_accuracy_percent: Number(accuracy.toFixed(2)),
  ts_misses: missesTs,
  ts_false_positives: falsePositiveTs,
  python_available: backendAvailable,
  python_accuracy_percent: backendAvailable ? Number(((rows.length - missesPy.length) / rows.length * 100).toFixed(2)) : null,
  python_misses: missesPy,
  python_false_positives: falsePositivePy,
  ts_python_differences: differences,
}, null, 2));
