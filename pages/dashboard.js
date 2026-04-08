import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";

// ── Constants ──────────────────────────────────────────────────────────────
const C = {
  navy: "#0D1B2A", navy2: "#142233", navy3: "#1C2E42",
  teal: "#0D9488", tealD: "#0A7A70", tealL: "#5EEAD4",
  gold: "#C9A84C", goldL: "#E2C97E",
  white: "#FFFFFF", grey: "#64748B", greyL: "#94A3B8",
  green: "#10B981", red: "#EF4444", purple: "#A78BFA",
};

const PLATFORMS = ["Claude", "ChatGPT", "Perplexity", "Gemini"];
const PLATFORM_ENDPOINTS = {
  Claude: "/api/query/claude",
  ChatGPT: "/api/query/chatgpt",
  Perplexity: "/api/query/perplexity",
  Gemini: "/api/query/gemini",
};
const CATEGORIES = ["destination", "experience", "planning"];
const CAT_LABELS = { destination: "Destination", experience: "Experience", planning: "Planning" };
const CAT_COLORS = { destination: C.teal, experience: C.gold, planning: C.purple };

// Personas imported from shared lib — see lib/personas.js
import { PERSONAS as DEFAULT_PERSONAS } from "../lib/personas";

const MARKET_OPTIONS = [
  { value: "Global",          label: "Global",          suffix: "" },
  { value: "United Kingdom",  label: "United Kingdom",  suffix: "according to UK travel media" },
  { value: "United States",   label: "United States",   suffix: "for US travellers" },
  { value: "Australia",       label: "Australia",       suffix: "for Australian travellers" },
  { value: "Europe",          label: "Europe",          suffix: "for European travellers" },
];

const SCORE_COLORS = { 0: C.red, 1: C.gold, 2: C.green };
const SCORE_ICONS  = { 0: "🔴", 1: "🟡", 2: "🟢" };
const SCORE_LABELS = { 0: "Not mentioned", 1: "Implied", 2: "Named" };

const DEFAULT_QUERIES = {
  destination: [
    { id: "d1", text: "Best all-inclusive resorts in [destination]", active: true },
    { id: "d2", text: "Best luxury hotels on the south coast of [destination]", active: true },
    { id: "d3", text: "Best boutique hotels in [destination]", active: true },
    { id: "d4", text: "Most highly rated hotels in [destination]", active: true },
    { id: "d5", text: "Hidden gem hotels in [destination]", active: false },
  ],
  experience: [
    { id: "e1", text: "Best hotel for a honeymoon in [destination]", active: true },
    { id: "e2", text: "Best family all-inclusive in [destination]", active: true },
    { id: "e3", text: "Best hotel for solo travel in [destination]", active: true },
    { id: "e4", text: "Best hotel for a girls trip in [destination]", active: true },
    { id: "e5", text: "Best hotel for LGBTQ+ travellers in [destination]", active: true },
    { id: "e6", text: "Most romantic hotel in [destination]", active: true },
    { id: "e7", text: "Best all-inclusive with the best food in [destination]", active: true },
    { id: "e8", text: "Best hotel for families with teenagers in [destination]", active: true },
    { id: "e9", text: "Best adults-only hotel in [destination]", active: false },
  ],
  planning: [
    { id: "p1", text: "Best hotel for a wedding in [destination]", active: true },
    { id: "p2", text: "Best hotel to propose in [destination]", active: true },
    { id: "p3", text: "Best hotel for a luxury anniversary trip in [destination]", active: true },
    { id: "p4", text: "Best all-inclusive to book for a special occasion in [destination]", active: true },
    { id: "p5", text: "Which hotel in [destination] should I book furthest in advance", active: false },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────
function resolveQ(text, dest) {
  return text.replace(/\[destination\]/gi, dest || "[destination]");
}
function buildQuery(text, dest, marketSuffix) {
  const base = resolveQ(text, dest);
  return marketSuffix ? `${base} ${marketSuffix}` : base;
}
function scoreCitation(text, property) {
  if (!text || !property) return 0;
  const t = text.toLowerCase();
  const escaped = property.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = t.match(new RegExp(escaped, "g"));
  if (!matches) return 0;
  if (matches.length > 1) return 2;
  const idx = t.indexOf(property.toLowerCase());
  if (idx < 200) return 2;
  const ctx = t.slice(Math.max(0, idx - 150), idx + 150);
  if (/\b(recommend|suggest|top pick|best option|number one|#1|first choice|standout|leading|our pick)\b/.test(ctx)) return 2;
  return 1;
}
function allActive(queries) {
  return CATEGORIES.flatMap(cat => queries[cat].filter(q => q.active));
}
function getCategoryForQuery(queries, queryId) {
  return CATEGORIES.find(cat => queries[cat].some(q => q.id === queryId)) || "destination";
}
function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function flatCount(obj) {
  return Object.values(obj).flatMap(p => Object.values(p).flatMap(pl => Object.values(pl))).length;
}

// ── Styles ─────────────────────────────────────────────────────────────────
const btn = (bg = C.teal, col = C.white, extra = {}) => ({
  background: bg, color: col, border: "none", borderRadius: 6,
  padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "Calibri, sans-serif", transition: "opacity 0.15s", ...extra,
});
const card = (extra = {}) => ({
  background: C.navy2, border: `1px solid ${C.navy3}`, borderRadius: 10, padding: 20, ...extra,
});
const inp = (extra = {}) => ({
  background: C.navy3, color: C.white, border: `1px solid #1E3A52`, borderRadius: 6,
  padding: "9px 12px", fontSize: 13, fontFamily: "Calibri, sans-serif", outline: "none", ...extra,
});
const tag = (color) => ({
  display: "inline-block", background: `${color}22`, color,
  border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px",
  fontSize: 11, fontWeight: 600, fontFamily: "Calibri, sans-serif",
});
const labelStyle = {
  display: "block", fontSize: 11, color: C.greyL, fontFamily: "Calibri, sans-serif",
  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontWeight: 600,
};

// ── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [tester, setTester] = useState("");
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    property: "", destination: "", context: "",
    market: "Global", competitor1: "", competitor2: "",
  });
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);
  const [selectedPersonas, setSelPersonas] = useState(["neutral"]);
  const [queries, setQueries] = useState(DEFAULT_QUERIES);
  const [activeCategory, setActiveCategory] = useState("destination");
  const [results, setResults] = useState({});
  const [compResults, setCompResults] = useState({ 1: {}, 2: {} });
  const [runMode, setRunMode] = useState("primary"); // "primary" | "competitor1" | "competitor2"
  const [testState, setTestState] = useState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "idle" });
  const [running, setRunning] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showAddPersona, setShowAdd] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: "", desc: "", icon: "🧳", prompt: "" });
  const [editQueryId, setEditQueryId] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["Claude", "ChatGPT", "Perplexity", "Gemini"]);
  const [sessionId] = useState(() => `SN-${Date.now().toString(36).toUpperCase()}`);
  const [showClients, setShowClients] = useState(false);
  const [clients, setClients] = useState([]);
  const [expandedComp, setExpandedComp] = useState({ 1: true, 2: true });
  const runningRef = useRef(false);
  const runModeRef = useRef("primary");

  // Auth
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.name) setTester(d.name);
      else router.push("/");
    });
  }, []);

  // Load clients from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("snClients") || "[]");
      setClients(saved);
    } catch {}
  }, []);

  const activePer = personas.filter(p => selectedPersonas.includes(p.id));
  const activeQ = allActive(queries);
  const ACTIVE_PLATFORMS = selectedPlatforms.length ? selectedPlatforms : PLATFORMS;
  const ts = testState;
  const curPersona = activePer[ts.personaIdx];
  const curPlatform = ACTIVE_PLATFORMS[ts.platformIdx];
  const curQuery = activeQ[ts.queryIdx];

  const totalTests = activePer.length * ACTIVE_PLATFORMS.length * activeQ.length;
  const doneTests = (() => {
    const obj = runMode === "primary" ? results : runMode === "competitor1" ? compResults[1] : compResults[2];
    return flatCount(obj);
  })();
  const pct = totalTests ? Math.round(doneTests / totalTests * 100) : 0;

  function setResult(personaId, platform, queryId, citationScore, response, sources) {
    const mode = runModeRef.current;
    if (mode === "primary") {
      setResults(prev => ({
        ...prev,
        [personaId]: {
          ...(prev[personaId] || {}),
          [platform]: {
            ...((prev[personaId] || {})[platform] || {}),
            [queryId]: { citationScore, response, sources },
          },
        },
      }));
    } else {
      const idx = mode === "competitor1" ? 1 : 2;
      setCompResults(prev => ({
        ...prev,
        [idx]: {
          ...prev[idx],
          [personaId]: {
            ...(prev[idx][personaId] || {}),
            [platform]: {
              ...((prev[idx][personaId] || {})[platform] || {}),
              [queryId]: { citationScore, response, sources },
            },
          },
        },
      }));
    }
  }

  function overrideScore(personaId, platform, queryId, newScore) {
    setResults(prev => ({
      ...prev,
      [personaId]: {
        ...(prev[personaId] || {}),
        [platform]: {
          ...((prev[personaId] || {})[platform] || {}),
          [queryId]: { ...(prev[personaId]?.[platform]?.[queryId] || {}), citationScore: newScore },
        },
      },
    }));
  }

  function getResult(personaId, platform, queryId, compIdx) {
    if (compIdx) return compResults[compIdx]?.[personaId]?.[platform]?.[queryId];
    return results?.[personaId]?.[platform]?.[queryId];
  }

  function currentRunGetResult(personaId, platform, queryId) {
    const mode = runMode;
    if (mode === "primary") return results?.[personaId]?.[platform]?.[queryId];
    const idx = mode === "competitor1" ? 1 : 2;
    return compResults[idx]?.[personaId]?.[platform]?.[queryId];
  }

  async function logToSheets(property, personaName, category, queryText, platform, citationScore, sources, runType) {
    try {
      await fetch("/api/sheets/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, property, destination: config.destination, market: config.market,
          persona: personaName, category: CAT_LABELS[category] || category,
          query: queryText, platform, citationScore, sources: sources || "",
          runType,
        }),
      });
    } catch (e) {
      console.error("Sheets log failed:", e);
    }
  }

  const advance = useCallback(() => {
    const totalQ = activeQ.length;
    const totalP = (selectedPlatforms.length ? selectedPlatforms : PLATFORMS).length;
    const totalPer = activePer.length;
    setTestState(prev => {
      let { personaIdx, platformIdx, queryIdx } = prev;
      queryIdx++;
      if (queryIdx >= totalQ) { queryIdx = 0; platformIdx++; }
      if (platformIdx >= totalP) { platformIdx = 0; personaIdx++; }
      if (personaIdx >= totalPer) return { personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "done" };
      return { personaIdx, platformIdx, queryIdx, phase: "running" };
    });
    setCurrentResponse("");
  }, [activeQ.length, activePer.length]);

  // Auto-run when in running state
  useEffect(() => {
    if (ts.phase !== "running" || runningRef.current) return;
    if (!curPersona || !curQuery) return;

    runningRef.current = true;
    setRunning(true);
    setCurrentResponse("");

    const mode = runModeRef.current;
    const propertyName = mode === "primary" ? config.property
      : mode === "competitor1" ? config.competitor1
      : config.competitor2;
    const marketSuffix = (MARKET_OPTIONS.find(m => m.value === config.market) || MARKET_OPTIONS[0]).suffix;
    const resolvedQuery = buildQuery(curQuery.text, config.destination, marketSuffix);
    const category = getCategoryForQuery(queries, curQuery.id);

    fetch(PLATFORM_ENDPOINTS[curPlatform], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: resolvedQuery, personaPrompt: curPersona.prompt }),
    })
      .then(r => r.json())
      .then(data => {
        const text = data.text || data.error || "No response";
        const sources = data.sources || "";
        const score = scoreCitation(text, propertyName);
        setCurrentResponse(text);
        setResult(curPersona.id, curPlatform, curQuery.id, score, text, sources);
        logToSheets(propertyName, curPersona.name, category, resolvedQuery, curPlatform, score, sources, mode === "primary" ? "Primary" : "Competitor");
        setTimeout(() => { runningRef.current = false; setRunning(false); advance(); }, 600);
      })
      .catch(err => {
        setCurrentResponse("Error: " + err.message);
        setResult(curPersona.id, curPlatform, curQuery.id, 0, "Error: " + err.message, "");
        setTimeout(() => { runningRef.current = false; setRunning(false); advance(); }, 600);
      });
  }, [ts.phase, ts.personaIdx, ts.platformIdx, ts.queryIdx]);

  // Done → run competitors or go to results
  useEffect(() => {
    if (ts.phase !== "done") return;
    const mode = runModeRef.current;
    const hasComp1 = config.competitor1?.trim();
    const hasComp2 = config.competitor2?.trim();
    if (mode === "primary" && hasComp1) {
      runModeRef.current = "competitor1";
      setRunMode("competitor1");
      runningRef.current = false;
      setTestState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "running" });
    } else if (mode === "competitor1" && hasComp2) {
      runModeRef.current = "competitor2";
      setRunMode("competitor2");
      runningRef.current = false;
      setTestState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "running" });
    } else {
      setStep(4);
    }
  }, [ts.phase]);

  function startTesting() {
    setResults({});
    setCompResults({ 1: {}, 2: {} });
    setCurrentResponse("");
    runningRef.current = false;
    runModeRef.current = "primary";
    setRunMode("primary");
    setTestState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "running" });
    setStep(3);
  }

  function addPersona() {
    if (!newPersona.name) return;
    const id = "custom_" + Date.now();
    setPersonas(prev => [...prev, { ...newPersona, id }]);
    setSelPersonas(prev => [...prev, id]);
    setNewPersona({ name: "", desc: "", icon: "🧳", prompt: "" });
    setShowAdd(false);
  }

  async function logout() {
    await fetch("/api/auth/logout");
    router.push("/");
  }

  function exportCSV() {
    const rows = [["Timestamp", "Tester", "Session", "Property", "Destination", "Market", "Persona", "Category", "Query", ...PLATFORMS, "Total Score"]];
    activePer.forEach(per => {
      activeQ.forEach(q => {
        const cat = getCategoryForQuery(queries, q.id);
        const platVals = PLATFORMS.map(p => {
          const r = getResult(per.id, p, q.id);
          return r === undefined ? "–" : String(r.citationScore ?? 0);
        });
        const totalScore = platVals.reduce((sum, v) => sum + (isNaN(Number(v)) ? 0 : Number(v)), 0);
        rows.push([
          new Date().toISOString(), tester, sessionId, config.property, config.destination,
          config.market, per.name, CAT_LABELS[cat], resolveQ(q.text, config.destination),
          ...platVals, totalScore,
        ]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `signal-noir-${config.property.replace(/\s+/g, "-")}-${sessionId}.csv`;
    a.click();
  }

  async function exportPPTX() {
    const PptxGenJs = (await import("pptxgenjs")).default;
    const prs = new PptxGenJs();
    prs.layout = "LAYOUT_WIDE";

    const BG = "0D1B2A", NAVY2 = "142233", NAVY3 = "1C2E42";
    const TEAL = "0D9488", TEALL = "5EEAD4", GOLD = "C9A84C", WHITE = "FFFFFF";
    const GREY = "64748B", GREYL = "94A3B8", GREEN = "10B981", RED = "EF4444";
    const scoreHex = { 0: RED, 1: GOLD, 2: GREEN };

    const summaryPersona = activePer.find(p => p.id === "neutral") || activePer[0];
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `SignalNoir_${config.property.replace(/\s+/g, "_")}_${dateStr}.pptx`;

    // ── Slide 1: Cover
    const s1 = prs.addSlide();
    s1.background = { color: BG };
    s1.addText("SIGNAL NOIR™", { x: 0.5, y: 1.4, w: 12, h: 0.9, color: TEAL, fontFace: "Calibri", fontSize: 42, bold: true, align: "center" });
    s1.addText("AI Citation Intelligence Report", { x: 0.5, y: 2.4, w: 12, h: 0.5, color: GREYL, fontFace: "Calibri", fontSize: 16, align: "center" });
    s1.addShape("rect", { x: 3.5, y: 3.05, w: 6, h: 0.03, fill: { color: TEAL }, line: { color: TEAL } });
    s1.addText(config.property, { x: 0.5, y: 3.2, w: 12, h: 0.85, color: GOLD, fontFace: "Calibri", fontSize: 30, bold: true, align: "center" });
    s1.addText(`${config.destination}  ·  ${config.market}`, { x: 0.5, y: 4.1, w: 12, h: 0.4, color: GREYL, fontFace: "Calibri", fontSize: 14, align: "center" });
    s1.addText(dateStr, { x: 0.5, y: 4.6, w: 12, h: 0.35, color: GREY, fontFace: "Calibri", fontSize: 12, align: "center" });

    // ── Slide 2: Summary table
    const s2 = prs.addSlide();
    s2.background = { color: BG };
    s2.addText(`${config.property} — Citation Summary`, {
      x: 0.3, y: 0.18, w: 12.5, h: 0.55, color: WHITE, fontFace: "Calibri", fontSize: 18, bold: true,
    });
    s2.addText(`${config.destination} · ${config.market}`, {
      x: 0.3, y: 0.72, w: 12.5, h: 0.3, color: GREYL, fontFace: "Calibri", fontSize: 11,
    });

    const hdrOpts = { bold: true, color: TEALL, fill: NAVY2, fontFace: "Calibri" };
    const tableRows = [
      [
        { text: "Query", options: { ...hdrOpts, align: "left" } },
        { text: "Category", options: hdrOpts },
        { text: "Claude", options: hdrOpts },
        { text: "ChatGPT", options: hdrOpts },
        { text: "Perplexity", options: hdrOpts },
        { text: "Gemini", options: hdrOpts },
        { text: "Total", options: hdrOpts },
      ],
      ...activeQ.map(q => {
        const cat = getCategoryForQuery(queries, q.id);
        const scores = PLATFORMS.map(p => getResult(summaryPersona?.id, p, q.id)?.citationScore ?? "–");
        const total = scores.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
        return [
          { text: resolveQ(q.text, config.destination).slice(0, 70), options: { color: WHITE, fill: BG, align: "left", fontFace: "Calibri" } },
          { text: CAT_LABELS[cat], options: { color: GREYL, fill: BG, fontFace: "Calibri" } },
          ...scores.map(s => ({ text: String(s), options: { color: typeof s === "number" ? scoreHex[s] || GREY : GREY, fill: BG, bold: true, fontFace: "Calibri" } })),
          { text: String(total), options: { color: total >= 6 ? GREEN : total >= 3 ? GOLD : total > 0 ? GREYL : RED, fill: BG, bold: true, fontFace: "Calibri" } },
        ];
      }),
    ];
    s2.addTable(tableRows, {
      x: 0.3, y: 1.1, w: 12.5,
      colW: [5.0, 1.2, 1.3, 1.3, 1.3, 1.3, 1.1],
      fontFace: "Calibri",
      fontSize: 9,
      rowH: 0.28,
      border: { type: "solid", pt: 0.5, color: NAVY3 },
      autoPage: true,
      autoPageRepeatHeader: true,
      autoPageBackground: { color: BG },
    });

    // ── Per-query slides
    const gridPos = [
      { x: 0.25, y: 0.85 },
      { x: 6.7,  y: 0.85 },
      { x: 0.25, y: 4.15 },
      { x: 6.7,  y: 4.15 },
    ];
    activeQ.forEach(q => {
      const cat = getCategoryForQuery(queries, q.id);
      const catColor = { destination: TEAL, experience: GOLD, planning: "A78BFA" }[cat] || TEAL;
      const sq = prs.addSlide();
      sq.background = { color: BG };

      sq.addShape("rect", { x: 0.25, y: 0.18, w: 0.18, h: 0.45, fill: { color: catColor }, line: { color: catColor } });
      sq.addText(resolveQ(q.text, config.destination), {
        x: 0.55, y: 0.18, w: 12.0, h: 0.45, color: WHITE, fontFace: "Calibri", fontSize: 14, bold: true, valign: "middle",
      });

      PLATFORMS.forEach((platform, i) => {
        const r = getResult(summaryPersona?.id, platform, q.id);
        const score = r?.citationScore ?? 0;
        const responseText = (r?.response || "No response recorded").slice(0, 300) + ((r?.response || "").length > 300 ? "…" : "");
        const { x, y } = gridPos[i];

        sq.addShape("rect", { x, y, w: 6.2, h: 3.1, fill: { color: NAVY2 }, line: { color: NAVY3, pt: 0.5 } });
        sq.addText([
          { text: platform, options: { color: TEALL, bold: true, fontSize: 10, breakLine: false } },
          { text: `   ${SCORE_LABELS[score]}`, options: { color: scoreHex[score] || RED, fontSize: 8, bold: true, breakLine: true } },
          { text: responseText, options: { color: GREYL, fontSize: 8 } },
        ], {
          x, y, w: 6.2, h: 3.1,
          fontFace: "Calibri",
          valign: "top",
          wrap: true,
          margin: [8, 8, 8, 8],
        });
      });
    });

    prs.writeFile({ fileName });
  }

  // ── Client management
  function saveClient() {
    const client = {
      id: genId(),
      name: config.property,
      destination: config.destination,
      market: config.market,
      context: config.context,
      competitor1: config.competitor1,
      competitor2: config.competitor2,
      savedQueries: queries,
      savedPersonas: selectedPersonas,
    };
    const updated = [...clients, client];
    setClients(updated);
    localStorage.setItem("snClients", JSON.stringify(updated));
  }

  function loadClient(client) {
    setConfig({
      property: client.name || "",
      destination: client.destination || "",
      market: client.market || "Global",
      context: client.context || "",
      competitor1: client.competitor1 || "",
      competitor2: client.competitor2 || "",
    });
    if (client.savedQueries) setQueries(client.savedQueries);
    if (client.savedPersonas) setSelPersonas(client.savedPersonas);
    setShowClients(false);
    setStep(0);
  }

  function deleteClient(id) {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    localStorage.setItem("snClients", JSON.stringify(updated));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.navy, minHeight: "100vh" }}>

      {/* ── Clients Panel ── */}
      {showClients && (
        <div
          onClick={e => e.target === e.currentTarget && setShowClients(false)}
          style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...card(), width: 560, maxHeight: "82vh", overflowY: "auto", padding: 28, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Client Profiles</div>
              <button onClick={() => setShowClients(false)} style={{ background: "none", border: "none", color: C.grey, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>

            {/* Save current */}
            {config.property ? (
              <div style={{ ...card({ padding: "14px 16px", marginBottom: 20, border: `1px solid ${C.teal}44` }) }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Save Current Config</div>
                <div style={{ fontSize: 12, color: C.greyL, fontFamily: "Calibri,sans-serif", marginBottom: 12 }}>
                  {config.property} · {config.destination} · {config.market}
                  {config.competitor1 && ` · vs ${config.competitor1}`}
                </div>
                <button style={btn(C.teal)} onClick={saveClient}>Save as Client Profile</button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: C.grey, fontFamily: "Calibri,sans-serif", marginBottom: 20, padding: "10px 14px", background: C.navy3, borderRadius: 6 }}>
                Enter a property name in Step 1 to save the current config.
              </div>
            )}

            {/* Client list */}
            {clients.length === 0 ? (
              <div style={{ fontSize: 13, color: C.grey, fontFamily: "Calibri,sans-serif", textAlign: "center", padding: "28px 0" }}>
                No saved client profiles yet.
              </div>
            ) : clients.map(c => (
              <div key={c.id} style={{ ...card({ marginBottom: 10, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }) }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.greyL, fontFamily: "Calibri,sans-serif", marginTop: 2 }}>
                    {c.destination} · {c.market || "Global"}
                    {c.competitor1 && ` · vs ${c.competitor1}`}
                    {c.competitor2 && `, ${c.competitor2}`}
                  </div>
                </div>
                <button style={btn(C.teal, C.white, { padding: "6px 14px", fontSize: 12 })} onClick={() => loadClient(c)}>Load</button>
                <button style={btn(C.navy3, C.red, { padding: "6px 14px", fontSize: 12, border: `1px solid ${C.red}44` })} onClick={() => deleteClient(c.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: C.navy2, borderBottom: `1px solid ${C.navy3}`, padding: "0 28px", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0", flex: 1 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>SIGNAL NOIR™</span>
          <span style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", letterSpacing: 0.5 }}>AI CITATION INTELLIGENCE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 16 }}>
          <button
            onClick={() => setShowClients(true)}
            style={{ ...btn(C.navy3, C.greyL, { padding: "6px 14px", fontSize: 12, border: `1px solid ${C.navy3}` }) }}>
            👥 Clients{clients.length ? ` (${clients.length})` : ""}
          </button>
          <span style={{ fontSize: 10, color: C.grey, fontFamily: "Calibri,sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>Mode</span>
          <button style={{ ...btn(C.teal, C.white, { padding: "6px 14px", fontSize: 12, fontWeight: 700 }) }}>
            1 · Property Visibility
          </button>
          <button onClick={() => router.push("/mode2")} style={{ ...btn(C.purple, C.white, { padding: "6px 14px", fontSize: 12, fontWeight: 700 }) }}>
            2 · Publication Authority →
          </button>
        </div>
        {tester && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ ...tag(C.teal), fontSize: 11 }}>🧑 {tester}</span>
            {sessionId && <span style={{ ...tag(C.grey), fontSize: 10 }}>{sessionId}</span>}
            <button onClick={logout} style={{ ...btn(C.navy3, C.greyL, { padding: "6px 14px", fontSize: 12, border: `1px solid ${C.navy3}` }) }}>Sign out</button>
          </div>
        )}
      </div>

      {/* ── Step tabs ── */}
      <div style={{ background: C.navy2, borderBottom: `1px solid ${C.navy3}`, padding: "0 28px", display: "flex" }}>
        {["Project Setup", "Personas", "Queries", "Run Tests", "Results"].map((lbl, i) => (
          <button key={i} onClick={() => i < step && setStep(i)}
            style={{
              background: "none", border: "none",
              borderBottom: step === i ? `2px solid ${C.teal}` : "2px solid transparent",
              color: step === i ? C.teal : i < step ? C.greyL : C.grey,
              padding: "12px 20px", fontSize: 12, fontFamily: "Calibri,sans-serif",
              fontWeight: 600, cursor: i < step ? "pointer" : "default", letterSpacing: 0.5,
            }}>
            {i + 1}. {lbl}
          </button>
        ))}
      </div>

      <div style={{ padding: "28px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── STEP 0: Project Setup ── */}
        {step === 0 && (
          <div>
            <div style={{ display:"flex", gap:14, marginBottom:32 }}>
              <div style={{ flex:1, background:"#0D944822", border:"2px solid #0D9488", borderRadius:10, padding:"16px 20px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0D9488", marginBottom:4 }}>🏨 Property Visibility — current mode</div>
                <div style={{ fontSize:12, color:"#94A3B8", fontFamily:"Calibri,sans-serif" }}>Test if AI cites a specific hotel. Feeds O2-style client slides.</div>
              </div>
              <div onClick={() => router.push("/mode2")} style={{ flex:1, background:"#A78BFA22", border:"2px solid #A78BFA", borderRadius:10, padding:"16px 20px", cursor:"pointer" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#A78BFA", marginBottom:4 }}>📰 Switch to Publication Authority →</div>
                <div style={{ fontSize:12, color:"#94A3B8", fontFamily:"Calibri,sans-serif" }}>Measure which publications AI cites. Feeds whitepaper & agency reports.</div>
              </div>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Project Setup</h2>
            <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 14, marginBottom: 24 }}>
              Define the property and destination you are testing visibility for.
            </p>

            {/* Main property + destination */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 680 }}>
              {[
                ["Property Name", "property", "e.g. O2 Beach Club & Spa", "Exact hotel name — used for citation detection"],
                ["Destination", "destination", "e.g. Barbados", "Fills [destination] in all queries"],
              ].map(([lbl, key, ph, hint]) => (
                <div key={key}>
                  <label style={labelStyle}>{lbl}</label>
                  <input style={{ ...inp(), width: "100%", boxSizing: "border-box" }}
                    placeholder={ph} value={config[key]}
                    onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} />
                  <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 5 }}>{hint}</div>
                </div>
              ))}
            </div>

            {/* Market selector */}
            <div style={{ marginTop: 20, maxWidth: 680 }}>
              <label style={labelStyle}>Market / Geographic Intent</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MARKET_OPTIONS.map(m => (
                  <button key={m.value} onClick={() => setConfig(p => ({ ...p, market: m.value }))}
                    style={{
                      ...btn(config.market === m.value ? C.teal : C.navy3, config.market === m.value ? C.white : C.greyL, {
                        padding: "7px 16px", fontSize: 12,
                        border: `1px solid ${config.market === m.value ? C.teal : C.navy3}`,
                      }),
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
              {config.market !== "Global" && (
                <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 6 }}>
                  Appends: <em>"{(MARKET_OPTIONS.find(m => m.value === config.market) || {}).suffix}"</em> to each query
                </div>
              )}
            </div>

            {/* Additional context */}
            <div style={{ marginTop: 20, maxWidth: 680 }}>
              <label style={labelStyle}>Additional Context (optional)</label>
              <textarea style={{ ...inp(), width: "100%", boxSizing: "border-box", height: 80, resize: "vertical" }}
                placeholder="e.g. Adults-only all-inclusive, TravelGay approved, south coast location…"
                value={config.context} onChange={e => setConfig(p => ({ ...p, context: e.target.value }))} />
            </div>
            {/* Platform selector */}
            <div style={{ marginTop:24, maxWidth:680 }}>
              <label style={{ display:"block", fontSize:11, color:C.greyL, fontFamily:"Calibri,sans-serif", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10, fontWeight:600 }}>Platforms to Test</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {["Claude","ChatGPT","Perplexity","Gemini"].map(p => {
                  const on = selectedPlatforms.includes(p);
                  const platformColors = { Claude:C.teal, ChatGPT:C.green, Perplexity:"#F97316", Gemini:C.gold };
                  const col = platformColors[p];
                  return (
                    <div key={p} onClick={() => setSelectedPlatforms(prev => on && prev.length > 1 ? prev.filter(x=>x!==p) : on ? prev : [...prev,p])}
                      style={{ padding:"8px 18px", borderRadius:6, cursor:"pointer", border:`1px solid ${on?col:C.navy3}`, background:on?`${col}22`:"none", color:on?col:C.grey, fontSize:13, fontFamily:"Calibri,sans-serif", fontWeight:600, transition:"all 0.15s", display:"flex", alignItems:"center", gap:6 }}>
                      {on && <span>✓</span>}{p}
                      {p === "Perplexity" && <span style={{ fontSize:10, color:C.grey }}>†</span>}
                    </div>
                  );
                })}
              </div>
              {selectedPlatforms.includes("Perplexity") && (
                <div style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif", marginTop:8 }}>
                  † Perplexity index volatility documented — results may vary significantly between sessions
                </div>
              )}
            </div>

            {/* Competitors */}
            <div style={{ marginTop: 20, maxWidth: 680 }}>
              <label style={labelStyle}>Competitor Benchmarking (optional)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <input style={{ ...inp(), width: "100%", boxSizing: "border-box" }}
                    placeholder="Competitor 1 (optional)"
                    value={config.competitor1}
                    onChange={e => setConfig(p => ({ ...p, competitor1: e.target.value }))} />
                  <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 5 }}>
                    Same queries will re-run for this property
                  </div>
                </div>
                <div>
                  <input style={{ ...inp(), width: "100%", boxSizing: "border-box" }}
                    placeholder="Competitor 2 (optional)"
                    value={config.competitor2}
                    onChange={e => setConfig(p => ({ ...p, competitor2: e.target.value }))} />
                </div>
              </div>
            </div>

            <button
              style={{ ...btn(C.teal, C.white, { marginTop: 28 }), opacity: config.property && config.destination ? 1 : 0.4 }}
              disabled={!config.property || !config.destination}
              onClick={() => setStep(1)}>
              Continue to Personas →
            </button>
          </div>
        )}

        {/* ── STEP 1: Personas ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Select Personas</h2>
            <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 14, marginBottom: 24 }}>
              Each persona simulates a different user type. All platforms run each query through each selected persona.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14, marginBottom: 24 }}>
              {personas.map(p => {
                const on = selectedPersonas.includes(p.id);
                return (
                  <div key={p.id} onClick={() => setSelPersonas(prev => on ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                    style={{ ...card(), cursor: "pointer", border: `1px solid ${on ? C.teal : C.navy3}`, background: on ? `${C.teal}18` : C.navy2, transition: "all 0.15s", position: "relative" }}>
                    {on && <div style={{ position: "absolute", top: 10, right: 12, color: C.teal, fontSize: 16, fontWeight: 700 }}>✓</div>}
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: C.greyL, fontFamily: "Calibri,sans-serif", lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                );
              })}
              <div onClick={() => setShowAdd(true)}
                style={{ ...card(), cursor: "pointer", border: `1px dashed ${C.grey}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 110, opacity: 0.7 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>＋</div>
                <div style={{ fontSize: 13, fontFamily: "Calibri,sans-serif", color: C.greyL }}>Add custom persona</div>
              </div>
            </div>

            {showAddPersona && (
              <div style={{ ...card({ maxWidth: 600, marginBottom: 24, border: `1px solid ${C.teal}44` }) }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>New Custom Persona</div>
                {[["Name", "name", "e.g. Wellness Traveller"], ["Description", "desc", "One-line summary"], ["Icon", "icon", "Emoji"]].map(([l, k, ph]) => (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>{l}</label>
                    <input style={{ ...inp(), width: "100%", boxSizing: "border-box" }} placeholder={ph}
                      value={newPersona[k]} onChange={e => setNewPersona(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>System Prompt</label>
                  <textarea style={{ ...inp(), width: "100%", boxSizing: "border-box", height: 80, resize: "vertical" }}
                    placeholder="Describe how this persona searches for travel…"
                    value={newPersona.prompt} onChange={e => setNewPersona(p => ({ ...p, prompt: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={btn(C.teal)} onClick={addPersona}>Add Persona</button>
                  <button style={btn(C.navy3, C.greyL, { border: `1px solid ${C.navy3}` })} onClick={() => setShowAdd(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button style={{ ...btn(C.teal), opacity: selectedPersonas.length ? 1 : 0.4 }}
                disabled={!selectedPersonas.length} onClick={() => setStep(2)}>
                Continue to Queries ({selectedPersonas.length} selected) →
              </button>
              <span style={{ fontSize: 12, color: C.grey, fontFamily: "Calibri,sans-serif" }}>
                ~{selectedPersonas.length * PLATFORMS.length * activeQ.length} total tests
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 2: Queries ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Edit Queries</h2>
            <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 14, marginBottom: 20 }}>
              Toggle, edit, or add queries. <code style={{ background: C.navy3, padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>[destination]</code> → <strong>{config.destination}</strong>
            </p>
            <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  background: activeCategory === cat ? `${CAT_COLORS[cat]}22` : "none",
                  border: activeCategory === cat ? `1px solid ${CAT_COLORS[cat]}66` : `1px solid ${C.navy3}`,
                  color: activeCategory === cat ? CAT_COLORS[cat] : C.greyL,
                  padding: "8px 20px", fontSize: 12, fontFamily: "Calibri,sans-serif", fontWeight: 600,
                  cursor: "pointer", letterSpacing: 0.5,
                  borderRadius: cat === "destination" ? "6px 0 0 6px" : cat === "planning" ? "0 6px 6px 0" : "0",
                }}>
                  {CAT_LABELS[cat].toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ maxWidth: 680 }}>
              {queries[activeCategory].map((q, i) => (
                <div key={q.id} style={{ ...card({ marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }), border: `1px solid ${q.active ? CAT_COLORS[activeCategory] + "44" : C.navy3}`, opacity: q.active ? 1 : 0.5 }}>
                  <div onClick={() => setQueries(prev => ({ ...prev, [activeCategory]: prev[activeCategory].map((qq, j) => j === i ? { ...qq, active: !qq.active } : qq) }))}
                    style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${q.active ? CAT_COLORS[activeCategory] : C.grey}`, background: q.active ? CAT_COLORS[activeCategory] : "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {q.active && <span style={{ fontSize: 12, color: C.white, fontWeight: 700 }}>✓</span>}
                  </div>
                  {editQueryId === q.id ? (
                    <input autoFocus style={{ ...inp(), flex: 1 }} value={q.text}
                      onChange={e => setQueries(prev => ({ ...prev, [activeCategory]: prev[activeCategory].map((qq, j) => j === i ? { ...qq, text: e.target.value } : qq) }))}
                      onBlur={() => setEditQueryId(null)} onKeyDown={e => e.key === "Enter" && setEditQueryId(null)} />
                  ) : (
                    <span style={{ flex: 1, fontSize: 13, fontFamily: "Calibri,sans-serif" }}>{resolveQ(q.text, config.destination)}</span>
                  )}
                  <button onClick={() => setEditQueryId(q.id)} style={{ background: "none", border: "none", color: C.grey, cursor: "pointer", fontSize: 14, padding: "4px 6px" }}>✏️</button>
                </div>
              ))}
              <button onClick={() => {
                const id = activeCategory[0] + Date.now();
                setQueries(prev => ({ ...prev, [activeCategory]: [...prev[activeCategory], { id, text: `Best [destination] hotel for `, active: true }] }));
                setTimeout(() => setEditQueryId(id), 50);
              }} style={{ ...btn("none", C.greyL, { border: `1px dashed ${C.grey}`, marginTop: 8 }) }}>
                + Add query
              </button>
            </div>
            <button style={{ ...btn(C.teal, C.white, { marginTop: 28 }) }} onClick={startTesting}>
              Start Testing ({activeQ.length} active queries × {activePer.length} persona{activePer.length !== 1 ? "s" : ""}) →
            </button>
          </div>
        )}

        {/* ── STEP 3: Running Tests ── */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Running Tests</h2>
                <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 13 }}>
                  All platforms running automatically. Results log to Google Sheets in real time.
                </p>
                {runMode !== "primary" && (
                  <div style={{ marginTop: 6, ...tag(C.gold), fontSize: 12 }}>
                    ⚡ Running competitor: {runMode === "competitor1" ? config.competitor1 : config.competitor2}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.teal }}>{pct}%</div>
                <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif" }}>{doneTests} / {totalTests} complete</div>
                <div style={{ width: 140, height: 4, background: C.navy3, borderRadius: 2, marginTop: 6 }}>
                  <div style={{ width: `${pct}%`, height: 4, background: C.teal, borderRadius: 2, transition: "width 0.4s" }} />
                </div>
              </div>
            </div>

            {ts.phase !== "done" && curPersona && curQuery && (
              <>
                {/* Persona pills */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {activePer.map((p, i) => (
                    <div key={p.id} style={{ ...card({ padding: "8px 14px" }), border: `1px solid ${i === ts.personaIdx ? C.teal : C.navy3}`, background: i === ts.personaIdx ? `${C.teal}18` : C.navy2, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{p.icon}</span>
                      <span style={{ fontSize: 12, fontFamily: "Calibri,sans-serif", color: i === ts.personaIdx ? C.white : C.grey }}>{p.name}</span>
                      {i < ts.personaIdx && <span style={{ color: C.teal, fontSize: 12 }}>✓</span>}
                    </div>
                  ))}
                </div>

                {/* Platform tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {PLATFORMS.map((p, i) => (
                    <div key={p} style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontFamily: "Calibri,sans-serif", background: i === ts.platformIdx ? `${C.gold}22` : C.navy2, border: `1px solid ${i === ts.platformIdx ? C.gold : C.navy3}`, color: i === ts.platformIdx ? C.gold : i < ts.platformIdx ? C.tealL : C.grey }}>
                      {i < ts.platformIdx ? "✓ " : ""}{p}
                    </div>
                  ))}
                </div>

                {/* Current test card */}
                <div style={{ ...card({ padding: 24, marginBottom: 20, border: `1px solid ${C.gold}44` }) }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                    <span style={tag(CAT_COLORS[getCategoryForQuery(queries, curQuery.id)])}>{CAT_LABELS[getCategoryForQuery(queries, curQuery.id)]}</span>
                    <span style={tag(C.teal)}>{curPersona.icon} {curPersona.name}</span>
                    <span style={tag(C.gold)}>{curPlatform}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif" }}>Query {ts.queryIdx + 1}/{activeQ.length}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                    "{resolveQ(curQuery.text, config.destination)}"
                  </div>
                  {running ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.teal, fontFamily: "Calibri,sans-serif" }}>
                      <div style={{ width: 16, height: 16, border: `2px solid ${C.teal}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Querying {curPlatform}…
                    </div>
                  ) : currentResponse ? (
                    <div>
                      <div style={{ background: C.navy3, borderRadius: 6, padding: 14, fontSize: 12, fontFamily: "Calibri,sans-serif", color: C.greyL, maxHeight: 150, overflowY: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {currentResponse.slice(0, 600)}{currentResponse.length > 600 ? "…" : ""}
                      </div>
                      {(() => {
                        const r = currentRunGetResult(curPersona.id, curPlatform, curQuery.id);
                        if (!r) return null;
                        return (
                          <div style={{ marginTop: 8, fontSize: 13, fontFamily: "Calibri,sans-serif", color: SCORE_COLORS[r.citationScore], fontWeight: 700 }}>
                            {SCORE_ICONS[r.citationScore]} {SCORE_LABELS[r.citationScore]} — "{runMode === "primary" ? config.property : runMode === "competitor1" ? config.competitor1 : config.competitor2}"
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>

                {/* Live results mini-table */}
                <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Live Results — {curPersona.name}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11, fontFamily: "Calibri,sans-serif" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "5px 10px", color: C.greyL, minWidth: 200 }}>Query</th>
                        {PLATFORMS.map(p => <th key={p} style={{ padding: "5px 10px", color: C.greyL, textAlign: "center" }}>{p}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {activeQ.map(q => (
                        <tr key={q.id} style={{ borderTop: `1px solid ${C.navy3}` }}>
                          <td style={{ padding: "5px 10px", color: C.greyL, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {resolveQ(q.text, config.destination)}
                          </td>
                          {PLATFORMS.map(p => {
                            const r = currentRunGetResult(curPersona.id, p, q.id);
                            return (
                              <td key={p} style={{ padding: "5px 10px", textAlign: "center" }}>
                                {r === undefined
                                  ? <span style={{ color: C.navy3 }}>·</span>
                                  : <span style={{ color: SCORE_COLORS[r.citationScore] }}>●</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 4: Results ── */}
        {step === 4 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Results</h2>
                <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 14 }}>
                  Signal Noir™ · {config.property} · {config.destination} · {config.market} · Session {sessionId}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button style={btn(C.gold, C.navy)} onClick={exportCSV}>↓ CSV</button>
                <button style={btn(C.teal, C.white)} onClick={exportPPTX}>↓ PPTX</button>
                <button style={btn(C.navy3, C.greyL, { border: `1px solid ${C.navy3}` })} onClick={() => { setStep(0); setResults({}); setCompResults({ 1: {}, 2: {} }); setTestState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "idle" }); }}>
                  New Session
                </button>
              </div>
            </div>

            {/* Score guide */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 11, fontFamily: "Calibri,sans-serif", color: C.grey }}>
              {[0, 1, 2].map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span>{SCORE_ICONS[s]}</span>
                  <span style={{ color: SCORE_COLORS[s] }}>{s}</span>
                  <span>— {SCORE_LABELS[s]}</span>
                </div>
              ))}
              <span style={{ color: C.navy3 }}>·</span>
              <span>Click 0 / 1 / 2 to override auto-score</span>
            </div>

            {/* Primary results */}
            {activePer.map(per => {
              const total = activeQ.length * PLATFORMS.length;
              const citedCount = activeQ.flatMap(q => PLATFORMS.map(p => getResult(per.id, p, q.id)?.citationScore ?? 0)).filter(s => s > 0).length;
              const pctPer = total ? Math.round(citedCount / total * 100) : 0;

              return (
                <div key={per.id} style={{ ...card({ marginBottom: 24 }) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.navy3}` }}>
                    <span style={{ fontSize: 22 }}>{per.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{per.name}</div>
                      <div style={{ fontSize: 12, color: C.greyL, fontFamily: "Calibri,sans-serif" }}>{per.desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: pctPer >= 75 ? C.teal : pctPer >= 50 ? C.gold : C.red }}>{pctPer}%</div>
                      <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif" }}>{citedCount}/{total} cited</div>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, fontFamily: "Calibri,sans-serif" }}>
                      <thead>
                        <tr>
                          <th style={{ width: 16, padding: "7px 10px" }} />
                          <th style={{ textAlign: "left", padding: "7px 10px", color: C.greyL, fontWeight: 600 }}>Query</th>
                          {PLATFORMS.map(p => <th key={p} style={{ padding: "7px 10px", color: C.greyL, fontWeight: 600, textAlign: "center", minWidth: 90 }}>{p}</th>)}
                          <th style={{ padding: "7px 10px", color: C.greyL, fontWeight: 600, textAlign: "center" }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CATEGORIES.flatMap(cat =>
                          queries[cat].filter(q => q.active).map(q => {
                            const platResults = PLATFORMS.map(p => getResult(per.id, p, q.id));
                            const scoreSum = platResults.reduce((s, r) => s + (r?.citationScore ?? 0), 0);
                            return (
                              <tr key={q.id} style={{ borderTop: `1px solid ${C.navy3}` }}>
                                <td style={{ padding: "7px 10px" }}>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                                </td>
                                <td style={{ padding: "7px 12px", color: C.greyL }}>{resolveQ(q.text, config.destination)}</td>
                                {PLATFORMS.map((p, i) => {
                                  const r = platResults[i];
                                  return (
                                    <td key={p} style={{ padding: "5px 10px", textAlign: "center" }}>
                                      {r === undefined ? (
                                        <span style={{ color: C.navy3 }}>·</span>
                                      ) : (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                          <span style={{ fontSize: 13 }}>{SCORE_ICONS[r.citationScore]}</span>
                                          <div style={{ display: "flex", gap: 2 }}>
                                            {[0, 1, 2].map(s => (
                                              <button key={s} title={SCORE_LABELS[s]}
                                                onClick={() => overrideScore(per.id, p, q.id, s)}
                                                style={{
                                                  padding: "1px 5px", fontSize: 9, fontFamily: "Calibri,sans-serif",
                                                  background: r.citationScore === s ? SCORE_COLORS[s] : C.navy3,
                                                  color: r.citationScore === s ? C.white : C.grey,
                                                  border: `1px solid ${r.citationScore === s ? SCORE_COLORS[s] : C.navy3}`,
                                                  borderRadius: 3, cursor: "pointer",
                                                }}>
                                                {s}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: scoreSum >= 6 ? C.green : scoreSum >= 3 ? C.gold : scoreSum > 0 ? C.greyL : C.red }}>
                                  {scoreSum}/8
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Platform summary */}
                  <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                    {PLATFORMS.map(p => {
                      const total = activeQ.reduce((s, q) => s + (getResult(per.id, p, q.id)?.citationScore ?? 0), 0);
                      const max = activeQ.length * 2;
                      return (
                        <div key={p} style={{ ...card({ padding: "10px 16px", flex: 1, minWidth: 110, textAlign: "center" }) }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: total / max >= 0.75 ? C.teal : total / max >= 0.5 ? C.gold : C.red }}>
                            {total}/{max}
                          </div>
                          <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 2 }}>{p}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Competitor results */}
            {[1, 2].map(idx => {
              const compName = idx === 1 ? config.competitor1 : config.competitor2;
              if (!compName?.trim()) return null;
              const compData = compResults[idx];
              if (flatCount(compData) === 0) return null;
              const expanded = expandedComp[idx];

              return (
                <div key={idx} style={{ marginBottom: 24 }}>
                  <div
                    onClick={() => setExpandedComp(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    style={{ ...card({ padding: "14px 20px", cursor: "pointer", border: `1px solid ${C.purple}44`, background: `${C.purple}0a`, marginBottom: expanded ? 0 : undefined }), display: "flex", alignItems: "center", gap: 12, borderRadius: expanded ? "10px 10px 0 0" : 10 }}>
                    <span style={{ ...tag(C.purple), fontSize: 12 }}>Competitor {idx}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{compName}</span>
                    <span style={{ color: C.grey, fontSize: 13 }}>{expanded ? "▲" : "▼"}</span>
                  </div>

                  {expanded && activePer.map(per => {
                    const total = activeQ.length * PLATFORMS.length;
                    const citedCount = activeQ.flatMap(q => PLATFORMS.map(p => getResult(per.id, p, q.id, idx)?.citationScore ?? 0)).filter(s => s > 0).length;
                    const pctComp = total ? Math.round(citedCount / total * 100) : 0;

                    return (
                      <div key={per.id} style={{ ...card({ border: `1px solid ${C.purple}33`, borderTop: "none", borderRadius: "0 0 10px 10px", marginBottom: 0 }) }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.navy3}` }}>
                          <span style={{ fontSize: 20 }}>{per.icon}</span>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{per.name}</div>
                          <div style={{ marginLeft: "auto", textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: pctComp >= 75 ? C.teal : pctComp >= 50 ? C.gold : C.red }}>{pctComp}%</div>
                            <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif" }}>{citedCount}/{total} cited</div>
                          </div>
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, fontFamily: "Calibri,sans-serif" }}>
                            <thead>
                              <tr>
                                <th style={{ width: 16, padding: "7px 10px" }} />
                                <th style={{ textAlign: "left", padding: "7px 10px", color: C.greyL, fontWeight: 600 }}>Query</th>
                                {PLATFORMS.map(p => <th key={p} style={{ padding: "7px 10px", color: C.greyL, fontWeight: 600, textAlign: "center" }}>{p}</th>)}
                                <th style={{ padding: "7px 10px", color: C.greyL, fontWeight: 600, textAlign: "center" }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {CATEGORIES.flatMap(cat =>
                                queries[cat].filter(q => q.active).map(q => {
                                  const platResults = PLATFORMS.map(p => getResult(per.id, p, q.id, idx));
                                  const scoreSum = platResults.reduce((s, r) => s + (r?.citationScore ?? 0), 0);
                                  return (
                                    <tr key={q.id} style={{ borderTop: `1px solid ${C.navy3}` }}>
                                      <td style={{ padding: "7px 10px" }}>
                                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                                      </td>
                                      <td style={{ padding: "7px 12px", color: C.greyL }}>{resolveQ(q.text, config.destination)}</td>
                                      {PLATFORMS.map((p, i) => {
                                        const r = platResults[i];
                                        return (
                                          <td key={p} style={{ padding: "5px 10px", textAlign: "center" }}>
                                            {r === undefined ? <span style={{ color: C.navy3 }}>·</span>
                                              : <span style={{ fontSize: 13 }}>{SCORE_ICONS[r.citationScore]}</span>}
                                          </td>
                                        );
                                      })}
                                      <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: scoreSum >= 6 ? C.green : scoreSum >= 3 ? C.gold : scoreSum > 0 ? C.greyL : C.red }}>
                                        {scoreSum}/8
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Legend */}
            <div style={{ display: "flex", gap: 20, fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 4 }}>
              {CATEGORIES.map(c => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[c] }} />
                  {CAT_LABELS[c]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
