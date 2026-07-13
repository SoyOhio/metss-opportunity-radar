type GrantHit = {
  id: string;
  number: string;
  title: string;
  agencyCode?: string;
  agency?: string;
  agencyName?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
  docType?: string;
  cfdaList?: string[];
  alnist?: string[];
};

const METSS_SIGNALS = [
  { terms: ["critical chemical", "critical material", "energetic", "precursor"], score: 18, capability: "Critical chemicals" },
  { terms: ["domestic production", "industrial base", "supply chain", "manufacturing"], score: 15, capability: "Domestic manufacturing" },
  { terms: ["cbrn", "chemical biological", "counter weapons", "decontamination", "decon"], score: 18, capability: "CBRN / decon" },
  { terms: ["advanced material", "polymer", "composite", "coating", "elastomer", "rubber", "resin", "barrier"], score: 12, capability: "Advanced materials" },
  { terms: ["lubricant", "hydraulic", "fluid", "grease", "electrochemical", "thermal management", "battery"], score: 11, capability: "Functional fluids" },
  { terms: ["testing", "validation", "compatibility", "sensor", "nondestructive", "evaluation"], score: 9, capability: "Testing / validation" },
  { terms: ["pfas", "fluorine-free", "green chemistry", "bio-based", "biobased"], score: 10, capability: "Advanced materials" },
];

function normalizeCloseDate(value?: string) {
  if (!value) return "9999-12-31";
  const [month, day, year] = value.split("/");
  return year && month && day ? `${year}-${month}-${day}` : value;
}

function scoreHit(hit: GrantHit, query: string) {
  const text = `${hit.title} ${hit.agency ?? hit.agencyName ?? ""} ${hit.number}`.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 44;
  if (text.includes(normalizedQuery)) score += 12;

  const capabilities = new Set<string>();
  for (const signal of METSS_SIGNALS) {
    if (signal.terms.some((term) => text.includes(term))) {
      score += signal.score;
      capabilities.add(signal.capability);
    }
  }

  if (/dod|defense|army|navy|air force|dtra|darpa|energy|transportation|nsf/i.test(text)) score += 6;
  if (!capabilities.size) capabilities.add("Requires technical screen");

  return {
    fit: Math.min(94, score),
    capabilities: Array.from(capabilities),
    titleIII: /critical chemical|critical material|domestic production|industrial base|supply chain|manufacturing/i.test(text),
  };
}

export async function GET(request: Request) {
  try {
    const query = new URL(request.url, "http://local").searchParams.get("q")?.trim();
    if (!query) return Response.json({ results: [], hitCount: 0 });

    const response = await fetch("https://api.grants.gov/v1/api/search2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: 30,
        keyword: query,
        oppStatuses: "forecasted|posted",
      }),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Grants.gov returned ${response.status}`);
    const payload = await response.json();
    const hits: GrantHit[] = payload?.data?.oppHits ?? [];

    const results = hits
      .map((hit) => {
        const screen = scoreHit(hit, query);
        return {
          id: `grants-${hit.id}`,
          title: hit.title,
          agency: hit.agency ?? hit.agencyName ?? hit.agencyCode ?? "Federal agency",
          office: "Live Grants.gov result",
          number: hit.number,
          type: "Grant / assistance",
          status: hit.oppStatus === "forecasted" ? "Forecast" : "Open",
          due: hit.closeDate ? `Due ${hit.closeDate}` : "No close date listed",
          dueSort: normalizeCloseDate(hit.closeDate),
          fit: screen.fit,
          titleIII: screen.titleIII,
          value: "Open official listing",
          role: "Requires METSS bid/no-bid screen",
          capabilities: screen.capabilities,
          summary: "Live result from the official Grants.gov opportunity API. Open the source listing to review the full technical scope and documents.",
          why: `Preliminary fit is based on the title, agency, and METSS capability signals found in this live record. Search term: “${query}.”`,
          action: "Open the official listing, verify eligibility and the technical ask, then assign a METSS technical owner before outreach or proposal work.",
          eligibility: "Review the official opportunity record; eligibility varies by program.",
          sourceUrl: `https://www.grants.gov/search-results-detail/${hit.id}`,
          sourceLabel: "Live Grants.gov API",
          verification: `Live posted/forecast record returned ${new Date().toISOString().slice(0, 10)}. Fit score is preliminary until human review.`,
          partnerIds: [],
          live: true,
        };
      })
      .sort((a, b) => b.fit - a.fit);

    return Response.json({
      results,
      hitCount: payload?.data?.hitCount ?? results.length,
      source: "Grants.gov search2 API",
    });
  } catch (error) {
    return Response.json(
      {
        results: [],
        hitCount: 0,
        error: error instanceof Error ? error.message : "Live grant search is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}
