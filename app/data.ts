import generatedGrants from "./generated/grants.json";

export type Opportunity = {
  id: string;
  title: string;
  agency: string;
  office: string;
  number: string;
  type: string;
  status: "Open" | "Forecast" | "Rolling" | "Watch" | "Revalidate" | "Closed";
  due: string;
  dueSort: string;
  fit: number;
  titleIII?: boolean;
  value: string;
  role: string;
  capabilities: string[];
  summary: string;
  why: string;
  action: string;
  eligibility: string;
  sourceUrl: string;
  sourceLabel: string;
  verification: string;
  partnerIds: string[];
  live?: boolean;
  sourceUpdatedAt?: string;
  sourceHash?: string;
  sourceClosedAt?: string;
  documentReviewComplete?: boolean;
  analysis?: Record<string, unknown>;
};

export type GrantsAudit = {
  generatedAt: string | null;
  currentInventory: number;
  fullyFetched: number;
  initiallyScreened: number;
  plausibleCandidates: number;
  completeDocumentReviews: number;
  incompleteDocumentReviews: number;
  deepReviewBacklog: number;
  published: number;
  rejectedAtInitialScreen: number;
  rejectedAtFinalGate: number;
  fetchErrors: number;
  triageErrors: number;
  screeningCycleComplete?: boolean;
  budgetStopped?: boolean;
  estimatedOpenAISpendUsd?: number;
  maxEstimatedRunSpendUsd?: number;
  reviewRulesVersion?: string;
  expirationGraceDays: number;
  sourceStatuses: string;
};

export type Vehicle = {
  id: string;
  name: string;
  owner: string;
  instrument: string;
  fit: number;
  titleIII: boolean;
  status: string;
  timing: string;
  entry: string;
  metssPlay: string;
  proofNeeded: string;
  partnerModel: string;
  sourceUrl: string;
};

export type Partner = {
  id: string;
  name: string;
  kind: "Industry" | "University" | "Customer" | "Enabler";
  baseScore: number;
  tags: string[];
  agencies: string;
  evidence: string;
  role: string;
  nextStep: string;
  sourceUrl: string;
};

export const capabilityCategories = [
  "CBRN / decon",
  "Advanced materials",
  "Functional fluids",
  "Testing / validation",
  "Domestic manufacturing",
  "Critical chemicals",
];

// Retained as an internal research archive only. These records are intentionally
// excluded from the displayed pipeline because they were not produced by the
// Grants.gov API monitor.
export const unmonitoredReferenceOpportunities: Opportunity[] = [
  {
    id: "nrl-f3",
    title: "F3 / AFFF alternative compatibility with shipboard nozzles",
    agency: "Naval Research Laboratory",
    office: "Technology Center for Safety & Survivability",
    number: "N00173-24-S-BA01 · Topic 61-24-26",
    type: "Long-range BAA",
    status: "Open",
    due: "Sep 30, 2026",
    dueSort: "2026-09-30",
    fit: 94,
    titleIII: false,
    value: "Not stated",
    role: "Testing / validation partner",
    capabilities: ["Functional fluids", "Advanced materials", "Testing / validation", "CBRN / decon"],
    summary: "The Navy needs an improved or retrofit aspiration approach that makes fluorine-free foam work with existing non-aspirating shipboard sprinkler nozzles.",
    why: "METSS is strongest on foam-fluid-material interactions, corrosion and plugging assessment, accelerated aging, environmental durability, and independent compatibility testing.",
    action: "Secure a nozzle, F3 foam, or shipboard-system partner; then build a white paper around METSS as the materials and validation lead.",
    eligibility: "Unrestricted BAA. White papers are accepted first; formal proposals are by invitation.",
    sourceUrl: "https://simpler.grants.gov/opportunity/890987ab-43f2-4384-8acb-5fcfabb06854",
    sourceLabel: "Simpler.Grants.gov",
    verification: "Official listing updated June 24, 2026; close date and amendment verified.",
    partnerIds: ["johnson-controls", "osu", "luna-labs"],
  },
  {
    id: "devcom-cbc",
    title: "CBRNE defense efforts broad agency announcement",
    agency: "U.S. Army DEVCOM",
    office: "Chemical Biological Center",
    number: "W911SR-24-R-DEVB",
    type: "BAA / contract / agreement",
    status: "Rolling",
    due: "Rolling to Aug 20, 2029",
    dueSort: "2029-08-20",
    fit: 93,
    titleIII: false,
    value: "Topic dependent",
    role: "Prime a narrow concept",
    capabilities: ["CBRN / decon", "Advanced materials", "Testing / validation"],
    summary: "A continuously open channel for research and development across decontamination, protective materials, sensors, biomaterials, testing, and other CBRNE mission areas.",
    why: "METSS has direct past performance in chemical/biological decontamination, sensitive-equipment survivability, materials compatibility, non-PFAS barriers, and applied defense R&D.",
    action: "Choose one mission problem and prepare a two-page concept or quad chart linked to specific METSS past performance.",
    eligibility: "Commercial firms and research organizations may submit. Awards depend on topic interest and available funding.",
    sourceUrl: "https://sam.gov/opp/6e54cc4efc0b4aae97ed39666a15b004/view",
    sourceLabel: "SAM.gov",
    verification: "Official SAM.gov notice; rolling date cross-checked against current BAA materials.",
    partnerIds: ["osu", "luna-labs", "physical-sciences"],
  },
  {
    id: "navy-carbon",
    title: "Domestic plant-based carbon fiber precursors for hypersonics",
    agency: "U.S. Navy",
    office: "SBIR 26.BZ",
    number: "DON26BZ04-NV066",
    type: "SBIR",
    status: "Forecast",
    due: "Opens Jul 22 · Due Aug 19, 2026",
    dueSort: "2026-08-19",
    fit: 90,
    titleIII: true,
    value: "SBIR phased award",
    role: "Prime or materials/process partner",
    capabilities: ["Advanced materials", "Domestic manufacturing", "Testing / validation"],
    summary: "The Navy seeks an environmentally improved U.S. source of rayon or other plant-based fiber precursors that can be carbonized for hypersonic thermal-protection systems.",
    why: "The domestic-capacity logic closely parallels Title III. METSS can contribute chemistry, process development, materials characterization, environmental tradeoffs, and scale-up planning.",
    action: "Run an immediate small-business eligibility and security-readiness check; identify a carbonization or hypersonic-composites teammate before the open date.",
    eligibility: "SBIR small-business rules apply. Advanced phases may require U.S. ownership, facility clearance, and personnel clearances.",
    sourceUrl: "https://www.sbir.gov/topics/12807",
    sourceLabel: "SBIR.gov",
    verification: "Official SBIR topic shows release July 1, open July 22, and due August 19, 2026.",
    partnerIds: ["canopy", "physical-sciences", "osu"],
  },
  {
    id: "erdc-baa",
    title: "ERDC 2026 broad agency announcement",
    agency: "U.S. Army Corps of Engineers",
    office: "Engineer Research & Development Center",
    number: "W912HZ26S0001",
    type: "BAA",
    status: "Open",
    due: "Open through Dec 31, 2026",
    dueSort: "2026-12-31",
    fit: 88,
    titleIII: false,
    value: "Multiple topic awards",
    role: "Prime or lab-specific teammate",
    capabilities: ["Advanced materials", "Functional fluids", "Testing / validation", "CBRN / decon"],
    summary: "ERDC accepts five-page pre-proposals by laboratory and topic, including materials and structures, environmental processes, hazardous-waste treatment, coatings, infrastructure, and sensing.",
    why: "METSS aligns with decontamination, coatings, materials compatibility, environmental chemistry, hazardous-material treatment, testing, and accelerated aging.",
    action: "Select one lab—most likely EL, CERL, or GSL—and submit a focused pre-proposal rather than a general capability statement.",
    eligibility: "Primary offeror needs business information and SAM registration; lab-specific submissions use the ERDCWERX intake process.",
    sourceUrl: "https://www.erdcwerx.org/u-s-army-engineer-research-and-development-center-broad-agency-announcement/",
    sourceLabel: "ERDCWERX",
    verification: "Official 2026 BAA and current ERDCWERX intake verified.",
    partnerIds: ["osu", "faraday", "tda-research"],
  },
  {
    id: "dtra-frc",
    title: "Fundamental research to counter weapons of mass destruction",
    agency: "Defense Threat Reduction Agency",
    office: "Chemical & Biological Technologies",
    number: "HDTRA1-25-S-0001",
    type: "Grant / cooperative agreement / OT",
    status: "Rolling",
    due: "Vehicle open to Sep 30, 2034",
    dueSort: "2034-09-30",
    fit: 86,
    titleIII: false,
    value: "$500M program",
    role: "University-teamed or focused industry research",
    capabilities: ["CBRN / decon", "Advanced materials", "Testing / validation"],
    summary: "A long-running DTRA research vehicle for fundamental Counter-WMD science. Individual topic amendments carry their own coordination and white-paper dates.",
    why: "METSS can anchor chemical/biological decon, agent persistence, barrier materials, microbiology, materials compatibility, and applied laboratory evaluation.",
    action: "Do not treat the 2034 close as a submission deadline. Review current topic amendments and coordinate the idea with the thrust-area mailbox first.",
    eligibility: "Industry is eligible, but university contribution is important for fundamental-research positioning and some topic structures.",
    sourceUrl: "https://simpler.grants.gov/opportunity/8faea2b6-4c0b-4e8d-ba24-f637ba6e7bcc",
    sourceLabel: "Simpler.Grants.gov",
    verification: "Official BAA is active; prior 2026 topic dates have passed and new topic status must be checked.",
    partnerIds: ["osu", "physical-sciences", "luna-labs"],
  },
  {
    id: "thermal-battery",
    title: "Next-generation thermal batteries for missile defense",
    agency: "Missile Defense Agency",
    office: "SBIR 26.BZ",
    number: "MDA26BZ04-NV001",
    type: "SBIR",
    status: "Forecast",
    due: "Opens Jul 22 · Due Aug 19, 2026",
    dueSort: "2026-08-19",
    fit: 80,
    titleIII: true,
    value: "SBIR phased award",
    role: "Materials / electrolyte / test teammate",
    capabilities: ["Advanced materials", "Functional fluids", "Testing / validation", "Domestic manufacturing"],
    summary: "MDA seeks major gains in thermal-battery energy and power density, safety, lifespan, miniaturization, electrolyte chemistry, electrode materials, and thermal management.",
    why: "METSS has materials, functional-fluid, chemical formulation, compatibility, and harsh-environment testing capabilities, but needs a credible battery systems partner.",
    action: "Target a thermal-battery OEM or experienced SBIR prime and offer focused chemistry, materials screening, and independent validation support.",
    eligibility: "SBIR small-business requirements apply; verify METSS ownership and PI-employment requirements before selecting prime versus subcontract role.",
    sourceUrl: "https://www.sbir.gov/topics/12799",
    sourceLabel: "SBIR.gov",
    verification: "Official SBIR topic shows release July 1, open July 22, and due August 19, 2026.",
    partnerIds: ["eaglepicher", "physical-sciences", "tda-research"],
  },
  {
    id: "soldier-center",
    title: "DEVCOM Soldier Center research and exploratory development",
    agency: "U.S. Army DEVCOM",
    office: "Soldier Center",
    number: "W911QY25R0023",
    type: "BAA",
    status: "Rolling",
    due: "Open through Feb 27, 2030",
    dueSort: "2030-02-27",
    fit: 78,
    titleIII: false,
    value: "Topic dependent",
    role: "Prime or teammate by topic",
    capabilities: ["Advanced materials", "Testing / validation", "CBRN / decon"],
    summary: "A broad Soldier Center channel for scientific study and experimentation. It can issue contracts, grants, cooperative agreements, purchase orders, or other transactions.",
    why: "METSS past work in shelters, protective materials, composites, field testing, and harsh-environment materials maps to selected Soldier Center areas.",
    action: "Screen the detailed technical areas; pursue only a defined materials, protection, shelter, packaging, or test problem.",
    eligibility: "Commercial firms, nonprofit research institutes, universities, and certain foreign organizations may submit.",
    sourceUrl: "https://simpler.grants.gov/opportunity/d585c440-7e3a-4f58-b09b-b5cc4f85955f",
    sourceLabel: "Simpler.Grants.gov",
    verification: "Official listing updated July 2025 and open through February 2030.",
    partnerIds: ["luna-labs", "physical-sciences", "osu"],
  },
  {
    id: "doe-genesis",
    title: "Genesis Mission — advanced manufacturing and critical materials",
    agency: "U.S. Department of Energy",
    office: "Office of Science and partner offices",
    number: "DE-FOA-0003612",
    type: "Other / research assistance",
    status: "Open",
    due: "Dec 17, 2026",
    dueSort: "2026-12-17",
    fit: 72,
    titleIII: true,
    value: "$293.8M program",
    role: "Industry testbed / data / scale-up partner",
    capabilities: ["Advanced materials", "Domestic manufacturing", "Testing / validation"],
    summary: "DOE is funding interdisciplinary teams that use advanced AI models and workflows in areas including advanced manufacturing, critical materials, biotechnology, and energy.",
    why: "METSS can be the applied industrial chemistry and materials validation environment, but should not lead with generic AI language.",
    action: "Approach a national-lab or university-led team with a specific experimental workflow, dataset, or manufacturing testbed METSS can provide.",
    eligibility: "Unrestricted, but the structure favors interdisciplinary teams; cost sharing applies.",
    sourceUrl: "https://simpler.grants.gov/opportunity/0228b895-9cb3-4160-8acc-58709e75c3c7",
    sourceLabel: "Simpler.Grants.gov",
    verification: "Official listing last updated May 13, 2026; documents updated July 2, 2026.",
    partnerIds: ["osu", "faraday", "tda-research"],
  },
];

const generatedSnapshot = generatedGrants as unknown as { opportunities?: Opportunity[]; audit?: GrantsAudit };
const generatedOpportunities = generatedSnapshot.opportunities ?? [];

export const grantsAudit: GrantsAudit = generatedSnapshot.audit ?? {
  generatedAt: null,
  currentInventory: 0,
  fullyFetched: 0,
  initiallyScreened: 0,
  plausibleCandidates: 0,
  completeDocumentReviews: 0,
  incompleteDocumentReviews: 0,
  deepReviewBacklog: 0,
  published: generatedOpportunities.length,
  rejectedAtInitialScreen: 0,
  rejectedAtFinalGate: 0,
  fetchErrors: 0,
  triageErrors: 0,
  expirationGraceDays: 20,
  sourceStatuses: "posted|forecasted",
};

// The displayed opportunity pipeline is source-pure: every record here came
// from the scheduled Grants.gov API monitor and its evidence-backed AI review.
export const opportunities: Opportunity[] = generatedOpportunities;

export const vehicles: Vehicle[] = [
  {
    id: "dpa-title-iii",
    name: "Defense Production Act Title III",
    owner: "DoD Industrial Base Policy / DPA Investments",
    instrument: "Agreement / contract / industrial-base investment",
    fit: 100,
    titleIII: true,
    status: "Core strategic vehicle · white-paper intake on legacy announcement is suspended",
    timing: "Monitor current DPAI focus areas and successor announcements",
    entry: "Agency priorities, targeted calls, or DIBC/MCEIP pathways; not a standing grant application.",
    metssPlay: "Use FA8650-24-2-5555 as proof that METSS can execute domestic critical-chemical capacity work. Position expansions around additional chemicals, safer processes, automation, QA/QC, precursors, and surge capacity.",
    proofNeeded: "Production-readiness plan, domestic shortfall evidence, demand signals, business case, milestone schedule, and cost share strategy.",
    partnerModel: "METSS + qualified buyer/prime + equipment/automation partner + Ohio expansion support.",
    sourceUrl: "https://www.businessdefense.gov/",
  },
  {
    id: "dibc",
    name: "Defense Industrial Base Consortium (DIBC)",
    owner: "MCEIP / ATI",
    instrument: "Other Transaction Agreement",
    fit: 98,
    titleIII: true,
    status: "Active vehicle · solicitations are episodic; OA-24-01 is closed",
    timing: "Join and monitor RPPs, RFSs, and future critical-chemical calls",
    entry: "DIBC membership and the ATI BIDS/AMP submission route are required for current member solicitations.",
    metssPlay: "Pre-build a critical-chemicals expansion concept so METSS can respond quickly when kinetic-capability, critical-chemical, strategic-material, manufacturing, or workforce calls open.",
    proofNeeded: "DIBC access, quad chart, domestic supply gap, readiness level, customer demand, budget, schedule, and nontraditional-contractor strategy.",
    partnerModel: "METSS + ACMI/prime/customer + process equipment and QA automation suppliers.",
    sourceUrl: "https://www.dibconsortium.org/solicitations/",
  },
  {
    id: "supplier-development",
    name: "Qualified domestic supplier development",
    owner: "Defense primes, munitions customers, and program offices",
    instrument: "Customer qualification / recurring supply",
    fit: 99,
    titleIII: true,
    status: "Build now — this is the main commercialization lane created by the award",
    timing: "Begin before full production maturity",
    entry: "Chemical-by-chemical buyer qualification, specifications, samples, quality documentation, and letters of interest.",
    metssPlay: "Turn funded capacity into recurring demand for the nine publicly listed chemicals used in energetics, pyrotechnics, munitions, countermeasures, and other defense systems.",
    proofNeeded: "Specification map, CoA template, QA/QC plan, production timing, sample plan, safety/logistics readiness, and volume/cost envelope.",
    partnerModel: "METSS + PacSci EMC, Chemring, GD-OTS, BAE Systems OSI, American Ordnance, Northrop Grumman, or similar buyers.",
    sourceUrl: "https://www.metss.com/copy-of-highlights",
  },
  {
    id: "devcom-vehicle",
    name: "DEVCOM CBC CBRNE Defense BAA",
    owner: "Army DEVCOM Chemical Biological Center",
    instrument: "Contracts, assistance, or prototype agreements",
    fit: 94,
    titleIII: false,
    status: "Open / rolling",
    timing: "Through August 20, 2029",
    entry: "Narrow pre-proposal tied to a CBC mission area and specific past performance.",
    metssPlay: "Lead in decon/material interactions, sensitive-equipment compatibility, protective materials, CBRN testing, or advanced chemical/biological materials.",
    proofNeeded: "Two-page concept or quad chart, technical lead, deliverable, rough cost, and transition path.",
    partnerModel: "Partner optional; add OSU or specialist only where the scope requires it.",
    sourceUrl: "https://sam.gov/opp/6e54cc4efc0b4aae97ed39666a15b004/view",
  },
  {
    id: "nrl-vehicle",
    name: "NRL Long Range BAA",
    owner: "Naval Research Laboratory",
    instrument: "Contract, grant, cooperative agreement, or OT",
    fit: 91,
    titleIII: false,
    status: "Open with summary-topic amendments",
    timing: "Current listing closes September 30, 2026",
    entry: "White paper to the email listed for the selected summary topic; formal proposal by invitation.",
    metssPlay: "Target materials performance, corrosion, electrochemistry, molecular/analytical chemistry, and F3 compatibility topics.",
    proofNeeded: "Innovation, naval relevance, risks, test plan, performance benefit, and rough order of magnitude cost.",
    partnerModel: "Use hardware/OEM partners where the topic requires a full system solution.",
    sourceUrl: "https://simpler.grants.gov/opportunity/890987ab-43f2-4384-8acb-5fcfabb06854",
  },
  {
    id: "erdc-vehicle",
    name: "ERDC Broad Agency Announcement",
    owner: "U.S. Army Engineer Research & Development Center",
    instrument: "BAA research award",
    fit: 89,
    titleIII: false,
    status: "Continuously open by lab/topic",
    timing: "Current 2026 intake through December 31, 2026",
    entry: "Five-page pre-proposal plus one-page executive summary to the relevant ERDC lab.",
    metssPlay: "Focus on EL, CERL, or GSL problems involving contamination, coatings, materials durability, hazardous-material treatment, infrastructure chemistry, or validation.",
    proofNeeded: "Single lab/topic, hypothesis, approach, PI, duration, outcome, and transition customer.",
    partnerModel: "Prime independently or add OSU/civil-environmental expertise when it materially strengthens the concept.",
    sourceUrl: "https://www.erdcwerx.org/u-s-army-engineer-research-and-development-center-broad-agency-announcement/",
  },
  {
    id: "dtra-vehicle",
    name: "DTRA Fundamental Research C-WMD BAA",
    owner: "Defense Threat Reduction Agency",
    instrument: "Grant, cooperative agreement, or research OT",
    fit: 86,
    titleIII: false,
    status: "Long-range vehicle; active topic windows vary",
    timing: "Vehicle to September 30, 2034",
    entry: "Coordinate the idea with the appropriate thrust area before a white paper.",
    metssPlay: "Use for early-stage CBRN science where METSS brings decontamination, materials compatibility, microbiology, agent persistence, or validation depth.",
    proofNeeded: "Fundamental-research question, technical novelty, publishable outcome, contribution strategy, and transition relevance.",
    partnerModel: "University-led or deeply university-teamed when fundamental-research rules make that the credible route.",
    sourceUrl: "https://simpler.grants.gov/opportunity/8faea2b6-4c0b-4e8d-ba24-f637ba6e7bcc",
  },
  {
    id: "sbir",
    name: "DoD SBIR/STTR and Direct to Phase II",
    owner: "DoD components / SBA program",
    instrument: "R&D contract or grant by agency",
    fit: 88,
    titleIII: true,
    status: "Recurring topic cycles",
    timing: "Screen each pre-release and open solicitation",
    entry: "Small-business prime; STTR requires a research-institution partner. Agency-specific rules control.",
    metssPlay: "Prime where METSS owns the technical concept; otherwise use past Phase II execution, materials testing, chemistry, fluids, and pilot-scale capability as a subcontract offer.",
    proofNeeded: "Small-business eligibility, PI commitment, commercialization path, data rights strategy, topic fit, and transition customer.",
    partnerModel: "METSS prime + OSU/qualified lab, or METSS subcontractor to a repeat Phase II winner.",
    sourceUrl: "https://www.sbir.gov/topics",
  },
  {
    id: "consortia",
    name: "Mission consortia: CWMD, MCDC, DOTC, NEST, DIBC",
    owner: "DoD program offices / ATI and other consortium managers",
    instrument: "Other Transactions",
    fit: 84,
    titleIII: true,
    status: "Active ecosystems; member opportunities vary",
    timing: "Join selectively before a relevant call appears",
    entry: "Consortium membership, member portal, and opportunity-specific submission.",
    metssPlay: "Use CWMD/MCDC for CBRN, DOTC/NEST for energetics and ordnance, and DIBC for critical chemicals and manufacturing capacity.",
    proofNeeded: "Membership cost/terms, security and CMMC needs, relevant buyer, defined technical role, and partner map.",
    partnerModel: "METSS as a focused chemistry/materials/testing work-package leader on a larger team.",
    sourceUrl: "https://www.ati.org/for-industry/",
  },
  {
    id: "ohio-stack",
    name: "Ohio manufacturing expansion stack",
    owner: "JobsOhio, One Columbus, Ohio MEP, workforce partners",
    instrument: "Incentives, loans, workforce, site, and technical assistance",
    fit: 90,
    titleIII: true,
    status: "Available when project needs are defined",
    timing: "Engage before equipment/site/workforce decisions are finalized",
    entry: "One-page Ohio project brief and eligibility discussion.",
    metssPlay: "Frame Title III critical-chemical capacity as Ohio defense manufacturing, workforce, supply-chain resilience, and process-modernization expansion.",
    proofNeeded: "Jobs, capital expenditure, equipment, site, training, safety, quality, and timing needs.",
    partnerModel: "METSS + JobsOhio/One Columbus + Ohio MEP + OSU/CDME as needed.",
    sourceUrl: "https://www.jobsohio.com/incentives-and-programs",
  },
];

export const partners: Partner[] = [
  {
    id: "physical-sciences",
    name: "Physical Sciences Inc.",
    kind: "Industry",
    baseScore: 96,
    tags: ["Advanced materials", "Testing / validation", "Domestic manufacturing", "Critical chemicals"],
    agencies: "MDA · Navy · Air Force",
    evidence: "The uploaded award intelligence identified 23 relevant awards, including 11 Phase II efforts, across advanced materials, sensors/testing, and manufacturing.",
    role: "Repeat SBIR prime; formulation, propellant, materials, or transition partner.",
    nextStep: "Approach with one specific topic and offer a bounded chemistry, compatibility, or test work package.",
    sourceUrl: "http://www.psicorp.com",
  },
  {
    id: "luna-labs",
    name: "Luna Labs USA",
    kind: "Industry",
    baseScore: 95,
    tags: ["Advanced materials", "Testing / validation", "Functional fluids", "CBRN / decon"],
    agencies: "Navy · MDA · Chemical/Biological Defense",
    evidence: "The uploaded award intelligence identified 19 relevant awards and six Phase II efforts in materials, testing, fluids, and CBRN-adjacent work.",
    role: "Advanced-materials or CBRN teammate with repeat transition experience.",
    nextStep: "Lead with the exact gap METSS fills—simulant testing, compatibility, formulation, or third-party validation.",
    sourceUrl: "https://lunalabs.us/",
  },
  {
    id: "faraday",
    name: "Faraday Technology",
    kind: "Industry",
    baseScore: 93,
    tags: ["Advanced materials", "Domestic manufacturing", "Functional fluids"],
    agencies: "Navy · MDA · DARPA",
    evidence: "The uploaded award intelligence showed strong coating, electrochemical, manufacturing, and scale-up overlap, with six Phase II efforts.",
    role: "Electrochemical process, coatings, manufacturing, and scale-up teammate.",
    nextStep: "Target ERDC, DOE, or defense-material calls where METSS provides testing and formulation while Faraday provides process technology.",
    sourceUrl: "https://faradaytechnology.com/",
  },
  {
    id: "tda-research",
    name: "TDA Research",
    kind: "Industry",
    baseScore: 93,
    tags: ["Functional fluids", "Advanced materials", "Testing / validation"],
    agencies: "Navy · DHA · Air Force",
    evidence: "The uploaded award intelligence identified 11 relevant awards and six Phase II efforts spanning high-performance materials, fluids, and testing.",
    role: "Materials/formulation prime needing focused test, compatibility, or scale-up support.",
    nextStep: "Use a current BAA or SBIR topic as the reason for outreach, not a generic capability introduction.",
    sourceUrl: "https://www.tda.com/",
  },
  {
    id: "canopy",
    name: "Canopy Aerospace",
    kind: "Industry",
    baseScore: 90,
    tags: ["Advanced materials", "Domestic manufacturing", "Testing / validation"],
    agencies: "Air Force · MDA",
    evidence: "The uploaded partner screen highlighted multiple hypersonic thermal-protection and domestic manufacturing awards.",
    role: "Hypersonics, thermal-protection, and carbon-material transition partner.",
    nextStep: "Explore the plant-based carbon precursor topic with a crisp split between precursor/process work and carbonization/TPS validation.",
    sourceUrl: "https://canopyaerospace.com/",
  },
  {
    id: "johnson-controls",
    name: "Shipboard nozzle / fire-system OEM",
    kind: "Industry",
    baseScore: 97,
    tags: ["Functional fluids", "Testing / validation", "Advanced materials"],
    agencies: "Navy · shipboard fire protection",
    evidence: "The current NRL F3 topic requires a nozzle, retrofit, or inlet-piping innovation—not only foam/material testing.",
    role: "Hardware and fire-suppression system lead; METSS supports compatibility and validation.",
    nextStep: "Target Tyco/Johnson Controls or another qualified naval fire-system integrator and share the three NRL solution pathways.",
    sourceUrl: "https://www.johnsoncontrols.com/fire-suppression",
  },
  {
    id: "eaglepicher",
    name: "Thermal-battery OEM / SBIR prime",
    kind: "Industry",
    baseScore: 96,
    tags: ["Advanced materials", "Functional fluids", "Testing / validation", "Domestic manufacturing"],
    agencies: "MDA · Navy · missile systems",
    evidence: "The MDA topic itself identifies established thermal-battery suppliers and calls for new electrolyte, electrode, thermal-management, and packaging concepts.",
    role: "Battery system and transition lead; METSS supplies chemistry/materials/test work packages.",
    nextStep: "Approach EaglePicher, EnerSys, or an experienced thermal-battery small business before the SBIR open date.",
    sourceUrl: "https://www.eaglepicher.com/",
  },
  {
    id: "osu",
    name: "The Ohio State University / CDME",
    kind: "University",
    baseScore: 92,
    tags: ["Advanced materials", "Testing / validation", "CBRN / decon", "Domestic manufacturing", "Critical chemicals"],
    agencies: "DoD · NSF · DOE · Ohio",
    evidence: "Adds university eligibility, analytical depth, modeling, specialized testing, student/workforce participation, and manufacturing expertise.",
    role: "Academic research lead or specialized subaward partner when the vehicle or topic benefits from university involvement.",
    nextStep: "Invite only around a defined scope—analytical chemistry, modeling, materials science, aerosol/biological work, or manufacturing.",
    sourceUrl: "https://cdme.osu.edu/",
  },
  {
    id: "acmi",
    name: "ACMI Federal / ACMI Group",
    kind: "Enabler",
    baseScore: 96,
    tags: ["Critical chemicals", "Domestic manufacturing"],
    agencies: "Munitions industrial base · MCEIP",
    evidence: "The uploaded strategic assessment identified ACMI as a critical-chemicals and munitions-campus relationship for demand aggregation and process modernization.",
    role: "Industrial-base ecosystem connector, infrastructure partner, and demand-aggregation channel.",
    nextStep: "Frame METSS as an existing Title III critical-chemicals awardee and request a focused discussion on demand, modernization, and follow-on calls.",
    sourceUrl: "https://acmigroup.com/",
  },
  {
    id: "pacific-scientific",
    name: "Pacific Scientific Energetic Materials",
    kind: "Customer",
    baseScore: 97,
    tags: ["Critical chemicals", "Domestic manufacturing", "Testing / validation"],
    agencies: "Munitions · energetics · DPA Title III",
    evidence: "A logical qualification and demand partner for military-grade energetic and pyrotechnic chemicals supported by domestic-capacity investments.",
    role: "Buyer, specification owner, qualification partner, or letter-of-interest source.",
    nextStep: "Lead with the exact chemical list, readiness timing, sample plan, and request for specification/qualification guidance.",
    sourceUrl: "https://www.psemc.com/",
  },
  {
    id: "chemring",
    name: "Chemring",
    kind: "Customer",
    baseScore: 94,
    tags: ["Critical chemicals", "Domestic manufacturing"],
    agencies: "Countermeasures · energetics · munitions",
    evidence: "A potential demand and qualification target for critical chemical inputs used in countermeasures, energetics, and defense-system formulations.",
    role: "Buyer, demand signal, specification reviewer, or co-investment partner.",
    nextStep: "Ask which listed chemicals create supply risk and what qualification package a new domestic source must provide.",
    sourceUrl: "https://www.chemring.com/",
  },
  {
    id: "gdots",
    name: "General Dynamics Ordnance and Tactical Systems",
    kind: "Customer",
    baseScore: 93,
    tags: ["Critical chemicals", "Domestic manufacturing", "Testing / validation"],
    agencies: "Army · Navy · munitions",
    evidence: "A large potential defense customer and demand-signal partner for energetic, pyrotechnic, and munitions supply chains.",
    role: "Buyer, qualification partner, transition customer, or teaming prime.",
    nextStep: "Route outreach through supply chain, energetics, or technology teams using a one-page supplier readiness summary.",
    sourceUrl: "https://www.gd-ots.com/",
  },
  {
    id: "jobsohio",
    name: "JobsOhio + One Columbus",
    kind: "Enabler",
    baseScore: 91,
    tags: ["Domestic manufacturing", "Critical chemicals"],
    agencies: "Ohio expansion · workforce · site",
    evidence: "The uploaded strategic assessment identified the Ohio expansion stack as a direct follow-on lane for equipment, workforce, facility, and manufacturing readiness.",
    role: "Incentive, workforce, site, and regional expansion support.",
    nextStep: "Prepare a one-page project brief with capital, jobs, equipment, site, safety, and schedule needs before the eligibility conversation.",
    sourceUrl: "https://www.jobsohio.com/incentives-and-programs",
  },
  {
    id: "ohio-mep",
    name: "Ohio MEP / Manufacturing Solutions",
    kind: "Enabler",
    baseScore: 88,
    tags: ["Domestic manufacturing", "Testing / validation", "Critical chemicals"],
    agencies: "Ohio manufacturing readiness",
    evidence: "Useful for manufacturing systems, quality, workforce, process readiness, and supplier-development support around the Title III buildout.",
    role: "Manufacturing-readiness and quality-system support.",
    nextStep: "Define the production-readiness gap first, then ask for a specific quality, automation, workforce, or process-improvement work package.",
    sourceUrl: "https://www.manufacturingsolutionscenter.org/",
  },
];

export const titleIIIChemicals = [
  "Barium nitrate",
  "Lead nitrate",
  "Potassium chlorate",
  "Potassium nitrate",
  "Potassium perchlorate",
  "Strontium nitrate",
  "Strontium oxalate",
  "Strontium peroxide",
  "Potassium sulfate",
];
