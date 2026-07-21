import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GRANTS_API, runGrantsSync } from "./lib/grants-sync.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(path.join(os.tmpdir(), "metss-grants-verification-"));
const files = {
  inventoryPath: path.join(temporary, "inventory.json"),
  recordsPath: path.join(temporary, "records.json"),
  historyPath: path.join(temporary, "history.json"),
  statusPath: path.join(temporary, "status.json"),
};
const options = { ...files, statuses: "forecasted|posted", rows: 5, maxRecords: 12, concurrency: 6 };

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function fetchOfficial(id) {
  const response = await fetch(`${GRANTS_API}/fetchOpportunity`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ opportunityId: Number(id) }),
  });
  if (!response.ok) throw new Error(`Verification fetch returned ${response.status}`);
  const payload = await response.json();
  if (!payload?.data?.id) throw new Error(`No live official record returned for ${id}`);
  return payload.data;
}

const first = await runGrantsSync(options);
const afterFirst = await readJson(files.recordsPath);
const second = await runGrantsSync(options);
const afterSecond = await readJson(files.recordsPath);

// Force one locally stored source hash stale, then prove the next live run
// updates that record while leaving the other eleven source records unchanged.
afterSecond.records[0].sourceHash = "verification-stale-source-hash";
await writeFile(files.recordsPath, `${JSON.stringify(afterSecond, null, 2)}\n`);
const third = await runGrantsSync(options);

// Prove one detail failure is logged and isolated while all other records are
// still checked and the previously stored failed record remains available.
const failureId = afterFirst.records[1].grantsGovId;
const fourth = await runGrantsSync({ ...options, injectDetailFailureIds: new Set([failureId]) });
const afterFourth = await readJson(files.recordsPath);

// Exercise an official closed result separately so closed-state preservation
// and the archived/closed counter are tested against the live API.
const closedDir = await mkdtemp(path.join(os.tmpdir(), "metss-grants-closed-verification-"));
const closed = await runGrantsSync({
  inventoryPath: path.join(closedDir, "inventory.json"),
  recordsPath: path.join(closedDir, "records.json"),
  historyPath: path.join(closedDir, "history.json"),
  statusPath: path.join(closedDir, "status.json"),
  statuses: "closed",
  rows: 1,
  maxRecords: 1,
  concurrency: 1,
});

const comparisons = [];
for (const stored of afterFourth.records.slice(0, 5)) {
  const official = await fetchOfficial(stored.grantsGovId);
  const sourceResponse = await fetch(stored.originalGrantsGovUrl, { redirect: "follow" });
  const officialBody = official.synopsis || official.forecast || {};
  comparisons.push({
    grantsGovId: stored.grantsGovId,
    opportunityNumber: stored.opportunityNumber,
    title: stored.title,
    sourceUrl: stored.originalGrantsGovUrl,
    sourceUrlHttpStatus: sourceResponse.status,
    checks: {
      id: String(official.id) === stored.grantsGovId,
      opportunityNumber: (official.opportunityNumber || null) === stored.opportunityNumber,
      title: (official.opportunityTitle || null) === stored.title,
      status: String(official.ost || "").toLowerCase() === stored.status,
      sourceUpdatedAt: (officialBody.lastUpdatedDate || officialBody.createdDate || null) === stored.sourceUpdatedAt,
      sourceLink: sourceResponse.ok && sourceResponse.url.includes(`/search-results-detail/${stored.grantsGovId}`),
    },
  });
}

const ids = afterFourth.records.map((record) => record.grantsGovId);
const duplicateCount = ids.length - new Set(ids).size;
const checks = {
  liveSynchronizationCompleted: first.attempt.status === "success",
  pagination: first.attempt.pagination.pagesRequested === 3 && first.attempt.pagination.pagesSucceeded === 3,
  firstRunStoredTwelve: first.attempt.counts.created === 12 && afterFirst.recordCount === 12,
  duplicatePrevention: second.attempt.counts.created === 0 && second.attempt.counts.unchanged === 12 && duplicateCount === 0,
  updateDetection: third.attempt.counts.updated === 1 && third.attempt.counts.created === 0 && third.attempt.counts.unchanged === 11,
  isolatedFailureVisible: fourth.attempt.status === "partial" && fourth.attempt.counts.failed === 1 && fourth.attempt.counts.fetched === 11,
  failedRecordPreserved: afterFourth.recordCount === 12 && afterFourth.records.some((record) => record.grantsGovId === failureId),
  closedStatusPreserved: closed.records[0]?.status === "closed" && closed.attempt.counts.archivedOrClosed === 1,
  fiveOfficialComparisons: comparisons.length === 5 && comparisons.every((item) => Object.values(item.checks).every(Boolean)),
};

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Live bounded Grants.gov verification: 12 current records, page size 5; plus one closed record.",
  temporaryDataDirectory: temporary,
  runs: {
    initial: first.attempt,
    idempotency: second.attempt,
    updateDetection: third.attempt,
    isolatedFailure: fourth.attempt,
    closedStatus: closed.attempt,
  },
  actualStoredRecordCount: afterFourth.recordCount,
  duplicateCount,
  injectedFailureRecord: failureId,
  comparisons,
  checks,
  passed: Object.values(checks).every(Boolean),
};

const reportPath = path.join(ROOT, "monitor", "grants-sync-verification.json");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;

