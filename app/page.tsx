"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  capabilityCategories,
  grantsAudit,
  grantsSync,
  opportunities,
  Opportunity,
  partners,
} from "./data";

type Tab = "opportunities" | "partners" | "saved";
type Sort = "fit" | "deadline";

const SAVED_SNAPSHOTS_KEY = "metss-opportunity-radar-saved-snapshots";

function isPastGracePeriod(item: Opportunity) {
  if (!item.dueSort || item.dueSort === "9999-12-31") return false;
  const closeDate = new Date(`${item.dueSort}T23:59:59Z`);
  if (Number.isNaN(closeDate.valueOf())) return false;
  closeDate.setUTCDate(closeDate.getUTCDate() + 20);
  return closeDate < new Date();
}

function escapeCsv(value: string | number | boolean) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatSyncTime(value: string | null | undefined) {
  if (!value) return "Not yet available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? value : parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("opportunities");
  const [searchDraft, setSearchDraft] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [capability, setCapability] = useState("All capabilities");
  const [instrument, setInstrument] = useState("All instruments");
  const [sort, setSort] = useState<Sort>("fit");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedSnapshots, setSavedSnapshots] = useState<Opportunity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPartnerOpportunity, setSelectedPartnerOpportunity] = useState(opportunities[0]?.id ?? "");
  const [partnerKind, setPartnerKind] = useState("All partner types");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("metss-opportunity-radar-saved");
        if (stored) setSavedIds(JSON.parse(stored));
        const storedSnapshots = window.localStorage.getItem(SAVED_SNAPSHOTS_KEY);
        if (storedSnapshots) setSavedSnapshots(JSON.parse(storedSnapshots));
      } catch {
        setSavedIds([]);
      } finally {
        setStorageReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem("metss-opportunity-radar-saved", JSON.stringify(savedIds));
      window.localStorage.setItem(SAVED_SNAPSHOTS_KEY, JSON.stringify(savedSnapshots));
    }
  }, [savedIds, savedSnapshots, storageReady]);

  const allOpportunities = opportunities;

  const filteredOpportunities = useMemo(() => {
    const terms = searchDraft.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = allOpportunities.filter((item) => {
      const haystack = [
        item.title,
        item.agency,
        item.office,
        item.number,
        item.type,
        item.role,
        item.summary,
        ...item.capabilities,
      ].join(" ").toLowerCase();
      return (
        (!terms.length || terms.every((term) => haystack.includes(term))) &&
        (capability === "All capabilities" || item.capabilities.includes(capability)) &&
        (instrument === "All instruments" || item.type.toLowerCase().includes(instrument.toLowerCase()))
      );
    });

    return [...list].sort((a, b) => sort === "fit" ? b.fit - a.fit : a.dueSort.localeCompare(b.dueSort));
  }, [allOpportunities, capability, instrument, searchDraft, sort]);

  const selectedOpportunity = [...allOpportunities, ...savedSnapshots].find((item) => item.id === selectedId) ?? null;
  const partnerOpportunity = opportunities.find((item) => item.id === selectedPartnerOpportunity) ?? opportunities[0] ?? null;

  const rankedPartners = useMemo(() => {
    return partners
      .filter((partner) => partnerKind === "All partner types" || partner.kind === partnerKind)
      .map((partner) => {
        const overlap = partnerOpportunity ? partner.tags.filter((tag) => partnerOpportunity.capabilities.includes(tag)).length : 0;
        const explicit = partnerOpportunity?.partnerIds.includes(partner.id) ?? false;
        return {
          ...partner,
          match: Math.min(100, partner.baseScore - 8 + overlap * 4 + (explicit ? 8 : 0)),
          overlap,
          explicit,
        };
      })
      .filter((partner) => partner.overlap > 0 || partner.explicit)
      .sort((a, b) => b.match - a.match);
  }, [partnerKind, partnerOpportunity]);

  const priorityPreview = filteredOpportunities.slice(0, 3);
  const savedOpportunities = [...new Map([...allOpportunities, ...savedSnapshots].map((item) => [item.id, item])).values()]
    .filter((item) => savedIds.includes(item.id));

  function jumpTo(tab: Tab) {
    setActiveTab(tab);
    window.setTimeout(() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function runSearch(event?: FormEvent, override?: string) {
    event?.preventDefault();
    const query = (override ?? searchDraft).trim();
    if (override !== undefined) setSearchDraft(override);
    setSubmittedQuery(query);
    setActiveTab("opportunities");
    window.setTimeout(() => document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function toggleSaved(id: string) {
    if (savedIds.includes(id)) {
      const item = savedOpportunities.find((candidate) => candidate.id === id);
      const noLongerActive = !opportunities.some((candidate) => candidate.id === id);
      if (item && (isPastGracePeriod(item) || noLongerActive)) {
        const confirmed = window.confirm("This opportunity is closed or no longer exists in the active pipeline. If you unsave it, the saved copy will be permanently removed from this device.\n\nSelect OK to remove it permanently, or Cancel to keep it saved.");
        if (!confirmed) return;
      }
      setSavedIds((current) => current.filter((savedId) => savedId !== id));
      setSavedSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));
      return;
    }
    const item = allOpportunities.find((candidate) => candidate.id === id);
    if (!item) return;
    setSavedIds((current) => [...current, id]);
    setSavedSnapshots((current) => [...current.filter((snapshot) => snapshot.id !== id), item]);
  }

  function openPartnerFinder(opportunity: Opportunity) {
    const monitored = opportunities.find((item) => item.id === opportunity.id);
    setSelectedPartnerOpportunity(monitored?.id ?? opportunities[0]?.id ?? "");
    setSelectedId(null);
    jumpTo("partners");
  }

  function exportCsv(rows: Opportunity[]) {
    const headers = ["Fit", "Title", "Agency", "Opportunity number", "Type", "Status", "Due", "Recommended role", "Next action", "Source"];
    const lines = [headers.map(escapeCsv).join(",")];
    for (const item of rows) {
      lines.push([
        item.fit,
        item.title,
        item.agency,
        item.number,
        item.type,
        item.status,
        item.due,
        item.role,
        item.action,
        item.sourceUrl,
      ].map(escapeCsv).join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "metss-opportunity-briefing.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="METSS Opportunity Radar home">
          <span className="brand-mark" aria-hidden="true"><i /></span>
          <strong>METSS</strong>
          <span className="brand-divider" />
          <span>Opportunity Radar</span>
        </button>
        <nav aria-label="Primary navigation">
          <button type="button" onClick={() => jumpTo("opportunities")} className={activeTab === "opportunities" ? "nav-active" : ""}>Opportunities</button>
          <button type="button" onClick={() => jumpTo("partners")} className={activeTab === "partners" ? "nav-active" : ""}>Partners</button>
          <button type="button" onClick={() => jumpTo("saved")} className={activeTab === "saved" ? "nav-active" : ""}>Saved <span className="nav-count">{savedIds.length}</span></button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">METSS federal opportunity intelligence</p>
          <h1>Find the opportunities METSS can actually win.</h1>
          <p className="hero-description">
            Monitor official federal grants, review complete public solicitation packages, and rank evidence-backed results against the full research, testing, engineering, and scale-up capabilities of METSS Corporation.
          </p>

          <form className="search-row" role="search" onSubmit={(event) => runSearch(event)}>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <span className="sr-only">Search opportunities</span>
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search Grants.gov opportunities, agencies, technologies…"
              />
            </label>
            <button className="search-button" type="submit">Search screened</button>
          </form>

          <div className="search-chips" aria-label="Suggested searches">
            <span>Try:</span>
            {["advanced materials", "specialty chemistry", "CBRNE decontamination", "testing and validation"].map((term) => (
              <button type="button" key={term} onClick={() => runSearch(undefined, term)}>{term}</button>
            ))}
          </div>

          <div className="metrics" aria-label="Opportunity summary">
            <div><span className="metric-icon">↗</span><strong>{opportunities.length}</strong><small>API-connected, AI-screened matches</small></div>
            <div><span className="metric-icon">✓</span><strong>{grantsAudit.completeDocumentReviews}</strong><small>Complete candidate reviews</small></div>
            <div><span className="metric-icon">●</span><strong>{grantsAudit.currentInventory && grantsAudit.currentInventory === grantsAudit.initiallyScreened ? "100%" : "Live"}</strong><small>Current Grants.gov inventory screened</small></div>
          </div>
        </div>

        <div className="radar-visual" aria-label="Decorative opportunity radar">
          <span className="radar-axis radar-axis-x" />
          <span className="radar-axis radar-axis-y" />
          <span className="radar-ring ring-one" />
          <span className="radar-ring ring-two" />
          <span className="radar-ring ring-three" />
          <span className="radar-ring ring-four" />
          <span className="radar-sweep" />
          <span className="radar-center" />
          <i className="radar-dot dot-one" />
          <i className="radar-dot dot-two" />
          <i className="radar-dot dot-three" />
          <i className="radar-dot dot-four" />
          <div className="radar-caption"><strong>METSS research fit</strong><span>Science · testing · engineering · scale-up</span></div>
        </div>
      </section>

      <section className="first-results" aria-label="Priority snapshot">
        <div className="priority-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Priority opportunities</span>
              <h2>{priorityPreview.length ? "Best current matches" : "No matches in this view"}</h2>
            </div>
            <button type="button" onClick={() => jumpTo("opportunities")}>View all opportunities <span>→</span></button>
          </div>
          <div className="priority-list">
            {priorityPreview.map((item) => (
              <article className="priority-row" key={item.id}>
                <span className="row-icon" aria-hidden="true">✦</span>
                <button className="row-copy" type="button" onClick={() => setSelectedId(item.id)}>
                  <h3>{item.title}</h3>
                  <p>{item.agency} <i>•</i> {item.type} <i>•</i> {item.due}</p>
                </button>
                <span className="fit-badge">{item.fit}% match</span>
                <button className={`save-button ${savedIds.includes(item.id) ? "saved" : ""}`} type="button" onClick={() => toggleSaved(item.id)} aria-label={`${savedIds.includes(item.id) ? "Remove" : "Save"} ${item.title}`}>{savedIds.includes(item.id) ? "★" : "☆"}</button>
              </article>
            ))}
          </div>
        </div>

        <aside className="saved-panel">
          <span className="section-kicker">Decision lanes</span>
          <h2>Return to the work that matters</h2>
          <button className="saved-search-card" type="button" onClick={() => runSearch(undefined, "research development")}><span>⌕</span><strong>Applied research</strong><small>R&D · engineering · transition</small><b>→</b></button>
          <button className="saved-search-card" type="button" onClick={() => runSearch(undefined, "advanced materials")}><span>⌕</span><strong>Advanced materials</strong><small>BAAs · SBIR · testing</small><b>→</b></button>
          <button className="saved-link" type="button" onClick={() => jumpTo("saved")}>★ {savedIds.length} saved item{savedIds.length === 1 ? "" : "s"}</button>
        </aside>
      </section>

      <div className="coverage-strip">
        <span><i /> Grants.gov connector {grantsSync.lastAttempt?.status === "success" ? "healthy" : grantsSync.lastAttempt?.status || "awaiting first sync"}</span>
        <span>Last successful check: {formatSyncTime(grantsSync.lastSuccessfulCheckAt)}{grantsSync.lastAttempt ? ` · ${grantsSync.lastAttempt.counts.fetched.toLocaleString()} fetched · ${grantsSync.lastAttempt.counts.created.toLocaleString()} created · ${grantsSync.lastAttempt.counts.updated.toLocaleString()} updated · ${grantsSync.lastAttempt.counts.unchanged.toLocaleString()} unchanged · ${grantsSync.lastAttempt.counts.failed.toLocaleString()} failed` : ""}</span>
        <button type="button" onClick={() => jumpTo("opportunities")}>View API-screened pipeline →</button>
      </div>

      <section className="workspace" id="workspace">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Opportunity command center</p>
            <h2>{activeTab === "opportunities" && "Screen the pipeline"}{activeTab === "partners" && "Build the right team"}{activeTab === "saved" && "Your working shortlist"}</h2>
          </div>
          <div className="tab-bar" role="tablist" aria-label="Opportunity intelligence views">
            {(["opportunities", "partners", "saved"] as Tab[]).map((tab) => (
              <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab === "saved" ? `Saved (${savedIds.length})` : tab[0].toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>
        </div>

        {activeTab === "opportunities" && (
          <div className="opportunity-workspace">
            <aside className="filter-panel">
              <div className="filter-title"><strong>Filters</strong><button type="button" onClick={() => { setCapability("All capabilities"); setInstrument("All instruments"); }}>Reset</button></div>
              <label>Capability<select value={capability} onChange={(event) => setCapability(event.target.value)}><option>All capabilities</option>{capabilityCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Instrument<select value={instrument} onChange={(event) => setInstrument(event.target.value)}><option>All instruments</option><option>BAA</option><option>SBIR</option><option>Grant</option><option>Other</option></select></label>
              <label>Sort by<select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="fit">Best METSS fit</option><option value="deadline">Nearest deadline</option></select></label>
              <div className="source-note">
                <strong>Grants.gov synchronization</strong>
                <p>Source: public Grants.gov API only</p>
                <p>Last successful check: {formatSyncTime(grantsSync.lastSuccessfulCheckAt)}</p>
                {grantsSync.lastAttempt && <>
                  <p>Last attempt: {grantsSync.lastAttempt.status} · started {formatSyncTime(grantsSync.lastAttempt.startedAt)} · completed {formatSyncTime(grantsSync.lastAttempt.completedAt)}</p>
                  <p>Fetched {grantsSync.lastAttempt.counts.fetched.toLocaleString()} · created {grantsSync.lastAttempt.counts.created.toLocaleString()} · updated {grantsSync.lastAttempt.counts.updated.toLocaleString()}</p>
                  <p>Unchanged {grantsSync.lastAttempt.counts.unchanged.toLocaleString()} · archived/closed {grantsSync.lastAttempt.counts.archivedOrClosed.toLocaleString()} · failed {grantsSync.lastAttempt.counts.failed.toLocaleString()}</p>
                  <p>Pages: {grantsSync.lastAttempt.pagination.pagesSucceeded.toLocaleString()} of {grantsSync.lastAttempt.pagination.pagesRequested.toLocaleString()} · source results {grantsSync.lastAttempt.pagination.totalAvailable.toLocaleString()}</p>
                </>}
                <details className="sync-history"><summary>Recent sync history and errors</summary>{grantsSync.recentAttempts.length ? grantsSync.recentAttempts.slice(0, 5).map((attempt) => <div key={attempt.id}><b>{attempt.status}</b> · {formatSyncTime(attempt.completedAt || attempt.startedAt)} · {attempt.counts.fetched} fetched · {attempt.counts.failed} failed{attempt.errors.map((error, index) => <p className="sync-error" key={`${attempt.id}-${index}`}>{error.stage}{error.record ? ` (${error.record})` : ""}: {error.message}</p>)}</div>) : <p>No synchronization attempts recorded yet.</p>}</details>
                <strong>Displayed screening coverage</strong>
                <p>Inventory: {grantsAudit.currentInventory.toLocaleString()} current records · screened: {grantsAudit.initiallyScreened.toLocaleString()}</p>
                <p>Not displayed: rejected, incomplete, static, or non-Grants.gov listings</p>
              </div>
            </aside>

            <div className="results-column">
              <div className="results-toolbar">
                <div><strong>{filteredOpportunities.length} METSS matches</strong><span>{submittedQuery ? ` · screened results matching “${submittedQuery}”` : " · Grants.gov API records with completed AI screening"}</span></div>
                <button type="button" onClick={() => exportCsv(filteredOpportunities)}>↓ Export briefing</button>
              </div>
              {submittedQuery && <div className="live-banner success"><span>●</span> Search is limited to opportunities that completed the full METSS screening and publication gate.</div>}
              <div className="opportunity-grid">
                {filteredOpportunities.map((item) => (
                  <article className="opportunity-card" key={item.id}>
                    <div className="card-score"><strong>{item.fit}</strong><small>fit</small></div>
                    <div className="card-main">
                      <div className="card-meta"><span className={`status status-${item.status.toLowerCase()}`}>{item.status}</span>{item.live && <span className="live-chip">Live API</span>}<span>{item.agency}</span></div>
                      <h3>{item.title}</h3>
                      <p className="opportunity-number">{item.number} · {item.type}</p>
                      <p className="card-summary">{item.summary}</p>
                      <div className="capability-tags">{item.capabilities.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
                      <div className="card-footer"><span><small>Deadline</small>{item.due}</span><span><small>Best role</small>{item.role}</span><span><small>Value</small>{item.value}</span></div>
                    </div>
                    <div className="card-actions"><button type="button" onClick={() => setSelectedId(item.id)}>Open analysis</button><button type="button" className={savedIds.includes(item.id) ? "saved" : ""} onClick={() => toggleSaved(item.id)} aria-label={`${savedIds.includes(item.id) ? "Remove" : "Save"} ${item.title}`}>{savedIds.includes(item.id) ? "★" : "☆"}</button></div>
                  </article>
                ))}
                {!filteredOpportunities.length && <div className="empty-state"><span>⌕</span><h3>No exact Grants.gov matches</h3><p>Reset a filter or broaden the Grants.gov search phrase.</p></div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "partners" && (
          <div className="partner-layout">
            <aside className="partner-controls">
              <p className="section-kicker">Partner finder</p>
              <h3>Match the partner to the ask.</h3>
              <p>Partners are ranked for a selected opportunity using documented capability overlap plus the specific missing role.</p>
              <label>Selected opportunity<select value={selectedPartnerOpportunity} onChange={(event) => setSelectedPartnerOpportunity(event.target.value)}>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              <label>Partner type<select value={partnerKind} onChange={(event) => setPartnerKind(event.target.value)}><option>All partner types</option><option>Industry</option><option>University</option><option>Customer</option><option>Enabler</option></select></label>
              {partnerOpportunity ? <div className="missing-role"><small>Recommended METSS role</small><strong>{partnerOpportunity.role}</strong><p>{partnerOpportunity.action}</p></div> : <div className="missing-role"><small>No monitored opportunity selected</small><p>The partner finder activates after the Grants.gov monitor publishes a screened result.</p></div>}
            </aside>
            <div className="partner-results">
              <div className="results-toolbar"><div><strong>{rankedPartners.length} matched partners</strong><span>{partnerOpportunity ? ` · ranked for ${partnerOpportunity.number}` : " · waiting for a monitored Grants.gov record"}</span></div></div>
              <div className="partner-grid">
                {rankedPartners.map((partner) => (
                  <article className="partner-card" key={partner.id}>
                    <div className="partner-top"><span className={`partner-kind kind-${partner.kind.toLowerCase()}`}>{partner.kind}</span><strong>{partner.match}% match</strong></div>
                    <h3>{partner.name}</h3>
                    <p className="partner-agencies">{partner.agencies}</p>
                    <p>{partner.evidence}</p>
                    <div className="capability-tags">{partner.tags.filter((tag) => partnerOpportunity?.capabilities.includes(tag)).map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <div className="partner-role"><small>Best role</small><strong>{partner.role}</strong><small>Next move</small><p>{partner.nextStep}</p></div>
                    <a href={partner.sourceUrl} target="_blank" rel="noreferrer">Open partner source ↗</a>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "saved" && (
          <div className="saved-workspace">
            <div className="saved-overview"><div><span>★</span><strong>{savedOpportunities.length}</strong><small>Saved opportunities</small></div><p>Shortlist the items worth discussing, then export a clean briefing for the METSS team.</p><button type="button" onClick={() => exportCsv(savedOpportunities)} disabled={!savedOpportunities.length}>↓ Export saved briefing</button></div>
            {savedOpportunities.length ? <div className="opportunity-grid">{savedOpportunities.map((item) => { const archived = isPastGracePeriod(item) || !opportunities.some((candidate) => candidate.id === item.id); return <article className="saved-opportunity" key={item.id}><span className="card-score"><strong>{item.fit}</strong><small>fit</small></span><div><span className="section-kicker">{item.agency}{archived ? " · Closed/Archived" : ""}</span><h3>{item.title}</h3><p>{item.number} · {item.due}</p><strong>{item.action}</strong></div><div><button type="button" onClick={() => setSelectedId(item.id)}>Open</button><button type="button" onClick={() => toggleSaved(item.id)}>Remove</button></div></article>; })}</div> : <div className="empty-state"><span>☆</span><h3>Your shortlist is empty</h3><p>Save the best opportunities from the pipeline and they will stay on this device.</p><button type="button" onClick={() => setActiveTab("opportunities")}>Browse opportunities</button></div>}
          </div>
        )}
      </section>

      <footer className="site-footer"><div><strong>METSS Opportunity Radar</strong><span>Decision support—not a substitute for the current solicitation, eligibility, legal, export-control, or security review.</span></div><div><a href="https://www.metss.com/contracts" target="_blank" rel="noreferrer">METSS contracts</a><a href="https://simpler.grants.gov/search" target="_blank" rel="noreferrer">Grants.gov</a><a href="https://sam.gov/search/?index=opp" target="_blank" rel="noreferrer">SAM.gov</a></div></footer>

      {selectedOpportunity && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedId(null); }}>
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
            <button className="drawer-close" type="button" onClick={() => setSelectedId(null)} aria-label="Close opportunity analysis">×</button>
            <div className="drawer-score"><span><strong>{selectedOpportunity.fit}</strong><small>METSS fit</small></span><div><em>{selectedOpportunity.status}</em></div></div>
            <p className="eyebrow">{selectedOpportunity.agency} · {selectedOpportunity.office}</p>
            <h2 id="drawer-title">{selectedOpportunity.title}</h2>
            <p className="drawer-number">{selectedOpportunity.number} · {selectedOpportunity.type}</p>
            <div className="drawer-facts"><div><small>Deadline</small><strong>{selectedOpportunity.due}</strong></div><div><small>Value</small><strong>{selectedOpportunity.value}</strong></div><div><small>Best METSS role</small><strong>{selectedOpportunity.role}</strong></div></div>
            <section><h3>What the buyer is asking for</h3><p>{selectedOpportunity.summary}</p></section>
            <section><h3>Why METSS fits</h3><p>{selectedOpportunity.why}</p></section>
            <section className="next-action"><h3>Recommended next action</h3><p>{selectedOpportunity.action}</p></section>
            <section><h3>Eligibility / gate</h3><p>{selectedOpportunity.eligibility}</p></section>
            <div className="capability-tags">{selectedOpportunity.capabilities.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="verification"><strong>Verification note</strong><p>{selectedOpportunity.verification}</p></div>
            <div className="drawer-actions"><a href={selectedOpportunity.sourceUrl} target="_blank" rel="noreferrer">Open {selectedOpportunity.sourceLabel} ↗</a><button type="button" onClick={() => toggleSaved(selectedOpportunity.id)}>{savedIds.includes(selectedOpportunity.id) ? "★ Saved" : "☆ Save"}</button><button type="button" onClick={() => openPartnerFinder(selectedOpportunity)}>Find partners →</button></div>
          </aside>
        </div>
      )}
    </main>
  );
}
