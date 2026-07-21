import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const GRANTS_API = "https://api.grants.gov/v1/api";

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalizeForHash(value) {
  if (Array.isArray(value)) {
    return value
      .map(canonicalizeForHash)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalizeForHash(value[key])]));
  }
  return value;
}

function stripHtml(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim() || null;
}

function valueOrNull(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function descriptions(values) {
  if (!Array.isArray(values)) return [];
  return values.map((item) => valueOrNull(item?.description ?? item?.name ?? item)).filter(Boolean).sort();
}

function normalizeStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "unavailable";
  if (raw.includes("forecast")) return "forecasted";
  if (raw.includes("post") || raw === "active" || raw === "open") return "posted";
  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("archive")) return "archived";
  if (raw.includes("close")) return "closed";
  if (raw.includes("unavailable") || raw.includes("withdraw")) return "unavailable";
  return raw;
}

function contactFrom(synopsis = {}) {
  const contact = {
    name: stripHtml(synopsis.agencyContactName || synopsis.agencyName),
    description: stripHtml(synopsis.agencyContactDesc),
    email: valueOrNull(synopsis.agencyContactEmail),
    phone: valueOrNull(synopsis.agencyContactPhone || synopsis.agencyPhone),
    address: stripHtml(synopsis.agencyAddressDesc),
  };
  return Object.values(contact).some(Boolean) ? contact : null;
}

function assistanceListings(detail = {}) {
  const source = Array.isArray(detail.cfdas) ? detail.cfdas : [];
  return source.map((item) => ({
    number: valueOrNull(item?.cfdaNumber),
    title: valueOrNull(item?.programTitle),
  })).filter((item) => item.number || item.title);
}

function relatedIdentifiers(detail = {}) {
  const related = [];
  for (const item of Array.isArray(detail.relatedOpps) ? detail.relatedOpps : []) {
    related.push({
      type: "related-opportunity",
      id: valueOrNull(item?.id ?? item?.opportunityId),
      number: valueOrNull(item?.opportunityNumber ?? item?.number),
      title: valueOrNull(item?.opportunityTitle ?? item?.title),
    });
  }
  for (const item of [
    ...(Array.isArray(detail.opportunityPkgs) ? detail.opportunityPkgs : []),
    ...(Array.isArray(detail.closedOpportunityPkgs) ? detail.closedOpportunityPkgs : []),
  ]) {
    related.push({
      type: "application-package",
      id: valueOrNull(item?.packageId ?? item?.id),
      number: valueOrNull(item?.competitionId ?? item?.opportunityNumber),
      title: valueOrNull(item?.competitionTitle ?? item?.opportunityTitle),
    });
  }
  return related.filter((item) => item.id || item.number || item.title);
}

export function normalizeOpportunity(searchHit, detail, checkedAt, previous = null) {
  // Forecast records use `forecast`; posted records use `synopsis`.
  // Treat the two official shapes uniformly without fabricating fields that
  // are not present in one of them.
  const synopsis = detail?.synopsis || detail?.forecast || {};
  const id = String(detail?.id ?? searchHit?.id ?? "").trim();
  if (!id) throw new Error("Opportunity is missing its Grants.gov identifier.");

  const rawStatus = searchHit?.oppStatus ?? detail?.ost ?? detail?.opportunityStatus;
  const normalized = {
    grantsGovId: id,
    opportunityNumber: valueOrNull(detail?.opportunityNumber ?? searchHit?.number),
    title: valueOrNull(detail?.opportunityTitle ?? searchHit?.title),
    agency: valueOrNull(synopsis?.topAgencyDetails?.agencyName ?? detail?.topAgencyDetails?.agencyName),
    subAgency: valueOrNull(synopsis?.agencyDetails?.agencyName ?? detail?.agencyDetails?.agencyName ?? searchHit?.agency),
    owningAgencyCode: valueOrNull(detail?.owningAgencyCode ?? synopsis?.agencyCode ?? searchHit?.agencyCode),
    status: normalizeStatus(rawStatus),
    statusAsProvided: valueOrNull(rawStatus),
    postedDate: valueOrNull(synopsis?.postingDate ?? searchHit?.openDate),
    closingDate: valueOrNull(synopsis?.responseDate ?? synopsis?.estApplicationResponseDate ?? searchHit?.closeDate),
    archiveDate: valueOrNull(synopsis?.archiveDate),
    estimatedFundingAmount: valueOrNull(synopsis?.estimatedFunding),
    awardCeiling: valueOrNull(synopsis?.awardCeiling),
    awardFloor: valueOrNull(synopsis?.awardFloor),
    expectedNumberOfAwards: valueOrNull(synopsis?.numberOfAwards),
    eligibilityInformation: stripHtml(synopsis?.applicantEligibilityDesc),
    applicantTypes: descriptions(synopsis?.applicantTypes),
    fundingInstruments: descriptions(synopsis?.fundingInstruments),
    opportunityCategory: valueOrNull(detail?.opportunityCategory?.description ?? detail?.opportunityCategory?.category),
    areasOfInterest: descriptions(synopsis?.fundingActivityCategories),
    fundingActivityDescription: stripHtml(synopsis?.fundingActivityCategoryDesc),
    synopsis: stripHtml(synopsis?.synopsisDesc ?? synopsis?.forecastDesc),
    contactInformation: contactFrom(synopsis),
    assistanceListings: assistanceListings(detail),
    relatedIdentifiers: relatedIdentifiers(detail),
    originalGrantsGovUrl: `https://www.grants.gov/search-results-detail/${id}`,
    sourceUpdatedAt: valueOrNull(synopsis?.lastUpdatedDate ?? synopsis?.createdDate),
  };

  const rawSource = { searchHit: searchHit ?? null, opportunity: detail ?? null };
  // Grants.gov occasionally returns set-like arrays in a different order.
  // Canonicalization prevents those ordering differences from being counted
  // as source updates while still hashing every preserved source field.
  const sourceHash = sha256(canonicalizeForHash({ normalized, rawSource }));
  const changed = !previous || previous.sourceHash !== sourceHash;

  return {
    ...normalized,
    sourceHash,
    firstRetrievedAt: previous?.firstRetrievedAt || checkedAt,
    lastCheckedAt: checkedAt,
    lastUpdatedAt: changed ? checkedAt : previous.lastUpdatedAt,
    rawSource,
  };
}

async function readJson(file, fallback) {
  try {
    const input = await readFile(file);
    const text = file.endsWith(".gz") ? (await gunzipAsync(input)).toString("utf8") : input.toString("utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw new Error(`Could not read ${file}: ${error.message}`);
  }
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(temporary, file.endsWith(".gz") ? await gzipAsync(content, { level: 9 }) : content);
  await rename(temporary, file);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJson(url, body, { attempts = 4, timeoutMs = 45_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 700)}`);
      const payload = JSON.parse(text);
      if (Number(payload?.errorcode ?? 0) !== 0) throw new Error(`Grants.gov error ${payload.errorcode}: ${payload?.msg || "unknown error"}`);
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(Math.min(2_000 * (2 ** (attempt - 1)), 15_000));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function searchCurrent({ statuses, rows, maxRecords, keyword, errors }) {
  const body = { rows, startRecordNum: 0, oppStatuses: statuses };
  if (keyword) body.keyword = keyword;
  const first = await postJson(`${GRANTS_API}/search2`, body);
  const totalAvailable = Number(first?.data?.hitCount || 0);
  const target = maxRecords > 0 ? Math.min(totalAvailable, maxRecords) : totalAvailable;
  const hits = [...(first?.data?.oppHits || [])];
  let pagesRequested = 1;
  let pagesSucceeded = 1;
  let pagesFailed = 0;

  for (let startRecordNum = rows; startRecordNum < target; startRecordNum += rows) {
    pagesRequested += 1;
    try {
      const payload = await postJson(`${GRANTS_API}/search2`, { ...body, startRecordNum });
      hits.push(...(payload?.data?.oppHits || []));
      pagesSucceeded += 1;
    } catch (error) {
      pagesFailed += 1;
      errors.push({ stage: "search-page", record: String(startRecordNum), message: String(error?.message || error) });
    }
  }

  const unique = [...new Map(hits.map((item) => [String(item?.id || ""), item])).values()]
    .filter((item) => item?.id)
    .slice(0, target);
  return { totalAvailable, target, hits: unique, pagesRequested, pagesSucceeded, pagesFailed };
}

async function mapWithConcurrency(items, limit, worker) {
  const output = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, run));
  return output;
}

async function fetchDetail(id) {
  const payload = await postJson(`${GRANTS_API}/fetchOpportunity`, { opportunityId: Number(id) });
  if (!payload?.data?.id) {
    const error = new Error("The detail response did not contain an opportunity record.");
    error.code = "GRANTS_RECORD_UNAVAILABLE";
    throw error;
  }
  return payload.data;
}

function publicAttempt(attempt) {
  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    durationSeconds: attempt.durationSeconds,
    scope: attempt.scope,
    counts: attempt.counts,
    pagination: attempt.pagination,
    integrity: attempt.integrity,
    errors: attempt.errors,
  };
}

async function updatePublicStatus(statusPath, history) {
  const attempts = history.attempts || [];
  const lastAttempt = attempts[0] || null;
  const lastSuccess = attempts.find((attempt) => attempt.status === "success") || null;
  await writeJsonAtomic(statusPath, {
    source: "Grants.gov public API",
    lastSuccessfulCheckAt: lastSuccess?.completedAt || null,
    lastAttempt: lastAttempt ? publicAttempt(lastAttempt) : null,
    recentAttempts: attempts.slice(0, 10).map(publicAttempt),
  });
}

function markInterruptedAttempts(history) {
  const recoveryTime = new Date().toISOString();
  let changed = false;
  history.attempts = (history.attempts || []).map((previousAttempt) => {
    if (previousAttempt.status !== "running") return previousAttempt;
    changed = true;
    return {
      ...previousAttempt,
      status: "failed",
      completedAt: recoveryTime,
      durationSeconds: Math.max(0, Math.round((Date.parse(recoveryTime) - Date.parse(previousAttempt.startedAt)) / 1000)),
      counts: { ...previousAttempt.counts, failed: Number(previousAttempt.counts?.failed || 0) + 1 },
      errors: [...(previousAttempt.errors || []), { stage: "interrupted-run", record: null, message: "The prior process ended before recording completion." }],
    };
  });
  return changed;
}

export async function recoverInterruptedSyncs({ historyPath, statusPath }) {
  const history = await readJson(historyPath, { schemaVersion: 1, attempts: [] });
  const changed = markInterruptedAttempts(history);
  if (changed) await writeJsonAtomic(historyPath, history);
  await updatePublicStatus(statusPath, history);
  return changed;
}

export async function runGrantsSync(options) {
  const {
    inventoryPath,
    recordsPath,
    historyPath,
    statusPath,
    statuses = "forecasted|posted",
    rows = 100,
    maxRecords = 0,
    keyword = "",
    concurrency = 8,
    detailDelayMs = 150,
    historyLimit = 50,
    injectDetailFailureIds = new Set(),
  } = options;
  const startedAt = new Date().toISOString();
  const attempt = {
    id: `grants-${startedAt}-${randomUUID().slice(0, 8)}`,
    status: "running",
    startedAt,
    completedAt: null,
    durationSeconds: null,
    scope: { statuses, keyword: keyword || null, maxRecords: maxRecords || null, pageSize: rows },
    counts: {
      fetched: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      removedFromActive: 0,
      archivedOrClosed: 0,
      failed: 0,
    },
    pagination: { totalAvailable: 0, target: 0, uniqueResults: 0, pagesRequested: 0, pagesSucceeded: 0, pagesFailed: 0 },
    integrity: { storedRecords: 0, duplicateIds: 0, duplicateOpportunityNumbers: 0 },
    errors: [],
  };
  const history = await readJson(historyPath, { schemaVersion: 1, attempts: [] });
  // A process can be cancelled by a runner or lose power before its catch
  // handler runs. Recover those stale "running" entries on the next start so
  // the public history never implies that an old job is still in progress.
  markInterruptedAttempts(history);
  history.attempts = [attempt, ...(history.attempts || [])].slice(0, historyLimit);
  await writeJsonAtomic(historyPath, history);
  await updatePublicStatus(statusPath, history);

  try {
    const store = await readJson(recordsPath, { schemaVersion: 1, source: "Grants.gov", updatedAt: null, records: [] });
    const previousInventory = await readJson(inventoryPath, { updatedAt: null, hitCount: 0, records: [] });
    const previousById = new Map((store.records || []).map((record) => [String(record.grantsGovId), record]));
    const search = await searchCurrent({ statuses, rows, maxRecords, keyword, errors: attempt.errors });
    attempt.pagination = {
      totalAvailable: search.totalAvailable,
      target: search.target,
      uniqueResults: search.hits.length,
      pagesRequested: search.pagesRequested,
      pagesSucceeded: search.pagesSucceeded,
      pagesFailed: search.pagesFailed,
    };

    const checkedAt = new Date().toISOString();
    const fetched = await mapWithConcurrency(search.hits, concurrency, async (hit) => {
      const id = String(hit.id);
      try {
        if (injectDetailFailureIds.has(id)) throw new Error("Injected verification failure.");
        const detail = await fetchDetail(id);
        return { hit, detail };
      } catch (error) {
        attempt.errors.push({ stage: "opportunity-detail", record: id, message: String(error?.message || error) });
        return null;
      } finally {
        if (detailDelayMs > 0) await wait(detailDelayMs);
      }
    });

    const currentSeen = new Set(search.hits.map((hit) => String(hit.id)));
    const nextById = new Map(previousById);
    for (const result of fetched.filter(Boolean)) {
      const id = String(result.hit.id);
      try {
        const previous = previousById.get(id) || null;
        const record = normalizeOpportunity(result.hit, result.detail, checkedAt, previous);
        nextById.set(id, record);
        attempt.counts.fetched += 1;
        if (!previous) attempt.counts.created += 1;
        else if (previous.sourceHash !== record.sourceHash) attempt.counts.updated += 1;
        else attempt.counts.unchanged += 1;
        if (["closed", "archived", "cancelled"].includes(record.status)) attempt.counts.archivedOrClosed += 1;
      } catch (error) {
        attempt.errors.push({ stage: "normalize", record: id, message: String(error?.message || error) });
      }
    }

    const canReconcileMissing = maxRecords === 0 && !keyword && search.pagesFailed === 0;
    if (canReconcileMissing) {
      const missingActive = [...previousById.values()].filter((record) =>
        ["posted", "forecasted"].includes(record.status) && !currentSeen.has(String(record.grantsGovId))
      );
      attempt.counts.removedFromActive = missingActive.length;
      const reconciled = await mapWithConcurrency(missingActive, concurrency, async (previous) => {
        try {
          let detail;
          try {
            detail = await fetchDetail(previous.grantsGovId);
          } catch (error) {
            if (error?.code !== "GRANTS_RECORD_UNAVAILABLE") throw error;
            // A record can disappear from the current search before Grants.gov
            // exposes a replacement lifecycle status. Retry once to avoid
            // classifying a transient empty response. If it remains absent,
            // retain the last official snapshot and mark it unavailable rather
            // than leaving a stale posted/forecasted status in the source store.
            await wait(1_000);
            try {
              detail = await fetchDetail(previous.grantsGovId);
            } catch (retryError) {
              if (retryError?.code !== "GRANTS_RECORD_UNAVAILABLE") throw retryError;
              detail = previous.rawSource?.opportunity || {
                id: Number(previous.grantsGovId),
                opportunityNumber: previous.opportunityNumber,
                opportunityTitle: previous.title,
              };
              return {
                previous,
                detail,
                syntheticHit: {
                  ...(previous.rawSource?.searchHit || {}),
                  id: previous.grantsGovId,
                  number: previous.opportunityNumber,
                  title: previous.title,
                  oppStatus: "unavailable",
                },
              };
            }
          }
          const detailStatus = normalizeStatus(detail?.ost ?? detail?.opportunityStatus);
          const effectiveStatus = ["posted", "forecasted"].includes(detailStatus) ? "unavailable" : detailStatus;
          const syntheticHit = {
            ...(previous.rawSource?.searchHit || {}),
            id: previous.grantsGovId,
            number: detail?.opportunityNumber ?? previous.opportunityNumber,
            title: detail?.opportunityTitle ?? previous.title,
            oppStatus: effectiveStatus,
          };
          return { previous, detail, syntheticHit };
        } catch (error) {
          attempt.errors.push({ stage: "status-reconciliation", record: previous.grantsGovId, message: String(error?.message || error) });
          return null;
        }
      });
      for (const result of reconciled.filter(Boolean)) {
        const record = normalizeOpportunity(result.syntheticHit, result.detail, checkedAt, result.previous);
        nextById.set(record.grantsGovId, record);
        attempt.counts.fetched += 1;
        if (result.previous.sourceHash !== record.sourceHash) attempt.counts.updated += 1;
        else attempt.counts.unchanged += 1;
        if (["closed", "archived", "cancelled", "unavailable"].includes(record.status)) attempt.counts.archivedOrClosed += 1;
      }
    }

    attempt.counts.failed = attempt.errors.length;
    attempt.status = attempt.errors.length ? "partial" : "success";
    attempt.completedAt = new Date().toISOString();
    attempt.durationSeconds = Math.round((Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt)) / 1000);

    const records = [...nextById.values()].sort((a, b) => String(a.grantsGovId).localeCompare(String(b.grantsGovId), undefined, { numeric: true }));
    const idCounts = new Map();
    const numberCounts = new Map();
    for (const record of records) {
      const id = String(record.grantsGovId || "").trim();
      if (id) idCounts.set(id, Number(idCounts.get(id) || 0) + 1);
      const number = String(record.opportunityNumber || "").trim().toLowerCase();
      if (number) numberCounts.set(number, Number(numberCounts.get(number) || 0) + 1);
    }
    attempt.integrity = {
      storedRecords: records.length,
      duplicateIds: [...idCounts.values()].filter((count) => count > 1).length,
      duplicateOpportunityNumbers: [...numberCounts.values()].filter((count) => count > 1).length,
    };
    await writeJsonAtomic(recordsPath, {
      schemaVersion: 1,
      source: "Grants.gov public API",
      updatedAt: attempt.completedAt,
      recordCount: records.length,
      records,
    });
    const inventoryRows = search.hits.map((item) => ({
      id: String(item.id), number: item.number ?? null, title: item.title ?? null,
      status: item.oppStatus ?? null, openDate: item.openDate ?? null,
      closeDate: item.closeDate ?? null, hash: sha256(item),
    }));
    const statusScope = String(statuses).split("|").filter(Boolean).sort().join("|");
    const replacesCompleteInventory = maxRecords === 0 && !keyword && search.pagesFailed === 0 && statusScope === "forecasted|posted";
    let nextInventoryRows = inventoryRows;
    let nextInventoryUpdatedAt = attempt.completedAt;
    let nextInventoryHitCount = search.totalAvailable;
    if (!replacesCompleteInventory) {
      const inventoryById = new Map((previousInventory.records || []).map((record) => [String(record.id), record]));
      for (const row of inventoryRows) inventoryById.set(row.id, row);
      nextInventoryRows = [...inventoryById.values()].sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
      nextInventoryUpdatedAt = previousInventory.updatedAt || attempt.completedAt;
      nextInventoryHitCount = Number(previousInventory.hitCount || nextInventoryRows.length);
    }
    await writeJsonAtomic(inventoryPath, {
      updatedAt: nextInventoryUpdatedAt,
      hitCount: nextInventoryHitCount,
      records: nextInventoryRows,
    });

    history.attempts[0] = attempt;
    await writeJsonAtomic(historyPath, history);
    await updatePublicStatus(statusPath, history);
    return { attempt, records };
  } catch (error) {
    attempt.errors.push({ stage: "synchronization", record: null, message: String(error?.message || error) });
    attempt.counts.failed = attempt.errors.length;
    attempt.status = "failed";
    attempt.completedAt = new Date().toISOString();
    attempt.durationSeconds = Math.round((Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt)) / 1000);
    history.attempts[0] = attempt;
    await writeJsonAtomic(historyPath, history);
    await updatePublicStatus(statusPath, history);
    throw error;
  }
}
