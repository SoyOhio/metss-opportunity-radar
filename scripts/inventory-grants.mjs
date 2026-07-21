import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(ROOT, "monitor", "grants-inventory.json");
const API = "https://api.grants.gov/v1/api/search2";

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function page(startRecordNum, rows = 100) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows, startRecordNum, oppStatuses: "forecasted|posted" })
  });
  if (!response.ok) throw new Error(`Grants.gov search2 returned ${response.status}`);
  return response.json();
}

const first = await page(0);
const total = Number(first?.data?.hitCount || 0);
const hits = [...(first?.data?.oppHits || [])];
for (let start = 100; start < total; start += 100) {
  const result = await page(start);
  hits.push(...(result?.data?.oppHits || []));
}
const records = [...new Map(hits.map((item) => [String(item.id), item])).values()]
  .map((item) => ({ id: String(item.id), number: item.number, title: item.title, status: item.oppStatus, openDate: item.openDate, closeDate: item.closeDate, hash: hash(item) }));
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
try {
  const previous = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  if (hash(previous.records || []) === hash(records)) {
    console.log(`No inventory change across ${records.length} current Grants.gov records.`);
    process.exit(0);
  }
} catch {
  // The first inventory run creates the file.
}
await writeFile(OUTPUT_PATH, `${JSON.stringify({ updatedAt: new Date().toISOString(), hitCount: total, records }, null, 2)}\n`);
console.log(`Inventoried ${records.length} unique of ${total} current Grants.gov records without using OpenAI.`);
