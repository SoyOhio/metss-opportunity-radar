import path from "node:path";
import { fileURLToPath } from "node:url";
import { recoverInterruptedSyncs, runGrantsSync } from "./lib/grants-sync.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  inventoryPath: process.env.GRANTS_INVENTORY_PATH || path.join(ROOT, "monitor", "grants-inventory.json"),
  recordsPath: process.env.GRANTS_RECORDS_PATH || path.join(ROOT, "monitor", "grants-source-records.json.gz"),
  historyPath: process.env.GRANTS_HISTORY_PATH || path.join(ROOT, "monitor", "grants-sync-history.json"),
  statusPath: process.env.GRANTS_STATUS_PATH || path.join(ROOT, "app", "generated", "grants-sync.json"),
};

if (process.env.GRANTS_SYNC_RECOVER_ONLY === "1") {
  const recovered = await recoverInterruptedSyncs(paths);
  console.log(recovered ? "Recorded interrupted Grants.gov synchronization." : "No interrupted synchronization required recovery.");
  process.exit(0);
}

const result = await runGrantsSync({
  ...paths,
  statuses: process.env.GRANTS_SYNC_STATUSES || "forecasted|posted",
  rows: Number(process.env.GRANTS_SYNC_PAGE_SIZE || 100),
  maxRecords: Number(process.env.GRANTS_SYNC_MAX_RECORDS || 0),
  keyword: process.env.GRANTS_SYNC_KEYWORD || "",
  concurrency: Number(process.env.GRANTS_SYNC_CONCURRENCY || 8),
  detailDelayMs: Number(process.env.GRANTS_SYNC_DETAIL_DELAY_MS || 150),
});

const { counts, pagination, status, completedAt } = result.attempt;
console.log(JSON.stringify({ status, completedAt, pagination, counts, errors: result.attempt.errors }, null, 2));
if (status === "partial") console.warn("The synchronization completed with isolated record errors; see the committed sync history.");
