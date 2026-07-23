import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY_PATH = path.join(ROOT, "monitor", "grants-inventory.json");
const RECORDS_PATH = path.join(ROOT, "monitor", "grants-source-records.json.gz");
const CACHE_PATH = path.join(ROOT, "monitor", "grants-screening-cache.json");
const SCREENING_PATH = path.join(ROOT, "app", "generated", "grants.json");
const OUTPUT_PATH = path.join(ROOT, "app", "generated", "grants-coverage.json");

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractLinks(value = "") {
  const source = String(value || "");
  const found = [];
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of source.matchAll(anchorPattern)) {
    found.push({ url: decodeHtml(match[1]), label: stripHtml(match[2]) || "Official referenced page" });
  }
  const plainPattern = /https?:\/\/[^\s<>"')\]]+/gi;
  for (const match of source.matchAll(plainPattern)) {
    found.push({ url: decodeHtml(match[0]), label: "Official referenced page" });
  }
  return found.flatMap((item) => {
    try {
      const url = new URL(item.url);
      if (!/^https?:$/i.test(url.protocol)) return [];
      url.hash = "";
      return [{ ...item, url: url.toString() }];
    } catch {
      return [];
    }
  });
}

function isIgnoredReference(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "grants.gov" || host.endsWith(".grants.gov") || /facebook|twitter|x\.com|linkedin|youtube/i.test(host);
  } catch {
    return true;
  }
}

function buildOfficialRecord(record) {
  const synopsis = record.synopsis || {};
  const attachments = (record.synopsisAttachmentFolders || []).flatMap((folder) =>
    (folder.synopsisAttachments || []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName || `attachment-${attachment.id}`,
      fileDescription: stripHtml(attachment.fileDescription || folder.folderName || folder.folderType),
      mimeType: attachment.mimeType || "",
      fileSize: Number(attachment.fileLobSize || 0),
      lastUpdatedDate: attachment.lastUpdatedDate || attachment.createdDate,
      url: `https://www.grants.gov/grantsws/rest/opportunity/att/download/${attachment.id}`,
      sourceType: "Grants.gov attachment",
    }))
  );
  const documentUrls = (record.synopsisDocumentURLs || []).map((document, index) => {
    const url = document.url || document.documentURL || document.documentUrl || document.link || String(document);
    return {
      id: `url-${index}`,
      fileName: document.description || document.name || url.split("/").pop()?.split(/[?#]/)[0] || `external-document-${index + 1}`,
      fileDescription: stripHtml(document.description || document.name || "Official external document URL"),
      mimeType: document.mimeType || "",
      fileSize: 0,
      lastUpdatedDate: synopsis.lastUpdatedDate,
      url,
      sourceType: "Official document URL",
    };
  }).filter((item) => /^https:\/\//i.test(item.url));
  const embeddedReferences = [
    synopsis.synopsisDesc,
    synopsis.applicantEligibilityDesc,
    synopsis.modComments,
    record.modifiedComments,
  ].flatMap((value) => extractLinks(value))
    .filter((item) => !isIgnoredReference(item.url))
    .map((item, index) => ({
      id: `embedded-url-${index}`,
      fileName: item.label || item.url.split("/").pop()?.split(/[?#]/)[0] || `official-reference-${index + 1}`,
      fileDescription: `Referenced by the official Grants.gov record: ${item.label || "official supporting page"}`,
      mimeType: "",
      fileSize: 0,
      lastUpdatedDate: synopsis.lastUpdatedDate,
      url: item.url,
      sourceType: "Official linked requirement URL",
    }));
  const synopsisUrlFields = Object.entries(synopsis)
    .filter(([key, value]) => /url|link/i.test(key) && typeof value === "string" && /^https?:\/\//i.test(value))
    .map(([key, value], index) => ({
      id: `synopsis-field-url-${index}`,
      fileName: stripHtml(synopsis[`${key.replace(/Url$/i, "")}Desc`] || synopsis.fundingDescLinkDesc || key),
      fileDescription: `Official Grants.gov ${key}`,
      mimeType: "",
      fileSize: 0,
      lastUpdatedDate: synopsis.lastUpdatedDate,
      url: value,
      sourceType: "Official linked requirement URL",
    }));
  const documents = [...new Map([...attachments, ...documentUrls, ...embeddedReferences, ...synopsisUrlFields]
    .map((item) => [item.url, item])).values()];

  return {
    opportunityId: record.id,
    opportunityNumber: record.opportunityNumber,
    opportunityTitle: record.opportunityTitle,
    opportunityCategory: record.opportunityCategory,
    agency: synopsis.agencyDetails?.agencyName || record.agencyDetails?.agencyName || record.owningAgencyCode,
    topAgency: synopsis.topAgencyDetails?.agencyName || record.topAgencyDetails?.agencyName,
    synopsis: stripHtml(synopsis.synopsisDesc),
    additionalEligibility: stripHtml(synopsis.applicantEligibilityDesc),
    applicantTypes: synopsis.applicantTypes || [],
    fundingInstruments: synopsis.fundingInstruments || [],
    fundingActivityCategories: synopsis.fundingActivityCategories || [],
    fundingActivityDescription: stripHtml(synopsis.fundingActivityCategoryDesc),
    postingDate: synopsis.postingDate,
    responseDate: synopsis.responseDate,
    archiveDate: synopsis.archiveDate,
    lastUpdatedDate: synopsis.lastUpdatedDate || synopsis.createdDate,
    modificationComments: stripHtml(synopsis.modComments || record.modifiedComments),
    costSharing: synopsis.costSharing,
    numberOfAwards: synopsis.numberOfAwards,
    estimatedFunding: synopsis.estimatedFunding,
    awardCeiling: synopsis.awardCeiling,
    awardFloor: synopsis.awardFloor,
    relatedOpportunities: record.relatedOpps || [],
    documents,
  };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function readGzipJson(file) {
  const chunks = [];
  await new Promise((resolve, reject) => {
    createReadStream(file)
      .pipe(createGunzip())
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", resolve)
      .on("error", reject);
  });
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const [inventory, sourceStore, cache, screening] = await Promise.all([
  readJson(INVENTORY_PATH, { updatedAt: null, records: [] }),
  readGzipJson(RECORDS_PATH),
  readJson(CACHE_PATH, { updatedAt: null, records: [] }),
  readJson(SCREENING_PATH, { generatedAt: null, audit: {}, opportunities: [] }),
]);

const sourceById = new Map((sourceStore.records || []).map((record) => [String(record.grantsGovId), record]));
const cacheById = new Map((cache.records || []).map((record) => [String(record.id), record]));
const criteriaVersion = screening.audit?.reviewRulesVersion || null;
let currentCovered = 0;
let currentNeedsScreening = 0;
let newRecordsRequiringScreening = 0;
let changedRecordsRequiringScreening = 0;

for (const inventoryRecord of inventory.records || []) {
  const id = String(inventoryRecord.id);
  const sourceRecord = sourceById.get(id);
  const cached = cacheById.get(id);
  const official = sourceRecord?.rawSource?.opportunity ? buildOfficialRecord(sourceRecord.rawSource.opportunity) : null;
  const currentSourceHash = official ? hash(official) : null;
  const covered = Boolean(
    cached?.triage &&
    currentSourceHash &&
    cached.sourceHash === currentSourceHash &&
    (!criteriaVersion || cached.reviewRulesVersion === criteriaVersion)
  );
  if (covered) currentCovered += 1;
  else {
    currentNeedsScreening += 1;
    if (!cached?.triage) newRecordsRequiringScreening += 1;
    else changedRecordsRequiringScreening += 1;
  }
}

const reusedOpportunityNumbers = new Map();
for (const record of sourceStore.records || []) {
  const number = String(record.opportunityNumber || "").trim().toLowerCase();
  if (!number) continue;
  const matches = reusedOpportunityNumbers.get(number) || [];
  matches.push({
    grantsGovId: String(record.grantsGovId),
    opportunityNumber: record.opportunityNumber,
    title: record.title,
    status: record.status,
    sourceUrl: record.originalGrantsGovUrl,
  });
  reusedOpportunityNumbers.set(number, matches);
}

const historicalNumberReuses = [...reusedOpportunityNumbers.values()].filter((records) => records.length > 1);
const output = {
  generatedAt: new Date().toISOString(),
  inventoryCheckedAt: inventory.updatedAt || null,
  screeningSnapshotAt: screening.generatedAt || screening.audit?.generatedAt || null,
  screeningCriteriaVersion: criteriaVersion,
  currentActiveSourceRecords: (inventory.records || []).length,
  historicalSourceRecords: (sourceStore.records || []).length,
  previouslyScreenedSnapshotRecords: Number(screening.audit?.initiallyScreened || 0),
  currentRecordsCoveredBySnapshot: currentCovered,
  currentRecordsRequiringScreening: currentNeedsScreening,
  newRecordsRequiringScreening,
  changedRecordsRequiringScreening,
  publishedMetssMatches: (screening.opportunities || []).length,
  historicalOpportunityNumberReuses: historicalNumberReuses,
};

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  currentActiveSourceRecords: output.currentActiveSourceRecords,
  historicalSourceRecords: output.historicalSourceRecords,
  previouslyScreenedSnapshotRecords: output.previouslyScreenedSnapshotRecords,
  currentRecordsCoveredBySnapshot: output.currentRecordsCoveredBySnapshot,
  currentRecordsRequiringScreening: output.currentRecordsRequiringScreening,
  newRecordsRequiringScreening: output.newRecordsRequiringScreening,
  changedRecordsRequiringScreening: output.changedRecordsRequiringScreening,
  publishedMetssMatches: output.publishedMetssMatches,
  historicalOpportunityNumberReuses: output.historicalOpportunityNumberReuses.length,
}, null, 2));
