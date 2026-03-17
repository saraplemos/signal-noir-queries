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

function resolveQ(text, dest) {
  return text.replace(/\[destination\]/gi, dest || "[destination]");
}
function isCited(text, property) {
  if (!text || !property) return false;
  return text.toLowerCase().includes(property.toLowerCase());
}
function allActive(queries) {
  return CATEGORIES.flatMap(cat => queries[cat].filter(q => q.active));
}
function getCategoryForQuery(queries, queryId) {
  return CATEGORIES.find(cat => queries[cat].some(q => q.id === queryId)) || "destination";
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
const label = {
  display: "block", fontSize: 11, color: C.greyL, fontFamily: "Calibri, sans-serif",
  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, fontWeight: 600,
};

// ── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [tester, setTester] = useState("");
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({ property: "", destination: "", context: "" });
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);
  const [selectedPersonas, setSelPersonas] = useState(["neutral"]);
  const [queries, setQueries] = useState(DEFAULT_QUERIES);
  const [activeCategory, setActiveCategory] = useState("destination");
  const [results, setResults] = useState({});
  const [testState, setTestState] = useState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "idle" });
  const [running, setRunning] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showAddPersona, setShowAdd] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: "", desc: "", icon: "🧳", prompt: "" });
  const [editQueryId, setEditQueryId] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["Claude", "ChatGPT", "Perplexity", "Gemini"]);
  const [sessionId] = useState(() => `SN-${Date.now().toString(36).toUpperCase()}`);
  const runningRef = useRef(false);

  // Get tester from auth
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.name) setTester(d.name);
      else router.push("/");
    });
  }, []);

  const activePer = personas.filter(p => selectedPersonas.includes(p.id));
  const activeQ = allActive(queries);
  const ts = testState;
  const curPersona = activePer[ts.personaIdx];
  const curPlatform = (selectedPlatforms.length ? selectedPlatforms : PLATFORMS)[ts.platformIdx];
  const curQuery = activeQ[ts.queryIdx];

  const totalTests = activePer.length * PLATFORMS.length * activeQ.length;
  const doneTests = Object.values(results).flatMap(p =>
    Object.values(p).flatMap(pl => Object.values(pl))
  ).length;
  const pct = totalTests ? Math.round(doneTests / totalTests * 100) : 0;

  function setResult(personaId, platform, queryId, cited, response, sources) {
    setResults(prev => ({
      ...prev,
      [personaId]: {
        ...(prev[personaId] || {}),
        [platform]: {
          ...((prev[personaId] || {})[platform] || {}),
          [queryId]: { cited, response, sources },
        },
      },
    }));
  }

  function getResult(personaId, platform, queryId) {
    return results?.[personaId]?.[platform]?.[queryId];
  }

  async function logToSheets(personaName, category, queryText, platform, cited, sources) {
    try {
      await fetch("/api/sheets/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId, property: config.property, destination: config.destination,
          persona: personaName, category: CAT_LABELS[category] || category,
          query: queryText, platform, cited, sources: sources || "",
        }),
      });
    } catch (e) {
      console.error("Sheets log failed:", e);
    }
  }

  const advance = useCallback(() => {
    const totalQ = activeQ.length;
    const totalP = ACTIVE_PLATFORMS.length;
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

    const resolvedQuery = resolveQ(curQuery.text, config.destination);
    const category = getCategoryForQuery(queries, curQuery.id);

    fetch(PLATFORM_ENDPOINTS[ACTIVE_PLATFORMS[ts.platformIdx]], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: resolvedQuery, personaPrompt: curPersona.prompt }),
    })
      .then(r => r.json())
      .then(data => {
        const text = data.text || data.error || "No response";
        const sources = data.sources || "";
        const cited = isCited(text, config.property);
        setCurrentResponse(text);
        setResult(curPersona.id, curPlatform, curQuery.id, cited, text, sources);
        logToSheets(curPersona.name, category, resolvedQuery, curPlatform, cited, sources);
        setTimeout(() => {
          runningRef.current = false;
          setRunning(false);
          advance();
        }, 600);
      })
      .catch(err => {
        setCurrentResponse("Error: " + err.message);
        setResult(curPersona.id, curPlatform, curQuery.id, false, "Error: " + err.message, "");
        setTimeout(() => {
          runningRef.current = false;
          setRunning(false);
          advance();
        }, 600);
      });
  }, [ts.phase, ts.personaIdx, ts.platformIdx, ts.queryIdx]);

  // Done → go to results
  useEffect(() => {
    if (ts.phase === "done") setStep(4);
  }, [ts.phase]);

  function startTesting() {
    setResults({});
    setCurrentResponse("");
    runningRef.current = false;
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
    const rows = [["Timestamp", "Tester", "Session", "Property", "Destination", "Persona", "Category", "Query", ...PLATFORMS, "Score"]];
    activePer.forEach(per => {
      activeQ.forEach(q => {
        const cat = getCategoryForQuery(queries, q.id);
        const platVals = PLATFORMS.map(p => {
          const r = getResult(per.id, p, q.id);
          return r === undefined ? "–" : r.cited ? "YES" : "NO";
        });
        const score = platVals.filter(v => v === "YES").length;
        rows.push([
          new Date().toISOString(), tester, sessionId, config.property, config.destination,
          per.name, CAT_LABELS[cat], resolveQ(q.text, config.destination),
          ...platVals, `${score}/4`,
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.navy, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: C.navy2, borderBottom: `1px solid ${C.navy3}`, padding: "0 28px", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0", flex: 1 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2 }}>SIGNAL NOIR™</span>
          <span style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", letterSpacing: 0.5 }}>AI CITATION INTELLIGENCE</span>
        </div>
        {tester && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ ...tag(C.teal), fontSize: 11 }}>🧑 {tester}</span>
            {sessionId && <span style={{ ...tag(C.grey), fontSize: 10 }}>{sessionId}</span>}
            <button onClick={logout} style={{ ...btn(C.navy3, C.greyL, { padding: "6px 14px", fontSize: 12, border: `1px solid ${C.navy3}` }) }}>Sign out</button>
          </div>
        )}
      </div>

      {/* Step tabs + mode switcher */}
      <div style={{ background: C.navy2, borderBottom: `1px solid ${C.navy3}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
        {["Project Setup", "Personas", "Queries", "Run Tests", "Results"].map((label, i) => (
          <button key={i} onClick={() => i < step && setStep(i)}
            style={{
              background: "none", border: "none",
              borderBottom: step === i ? `2px solid ${C.teal}` : "2px solid transparent",
              color: step === i ? C.teal : i < step ? C.greyL : C.grey,
              padding: "12px 20px", fontSize: 12, fontFamily: "Calibri,sans-serif",
              fontWeight: 600, cursor: i < step ? "pointer" : "default", letterSpacing: 0.5,
            }}>
            {i + 1}. {label}
          </button>
        ))}
        </div>
        <button onClick={() => router.push("/mode2")} style={{ background:"#A78BFA22", color:"#A78BFA", border:"1px solid #A78BFA44", borderRadius:6, padding:"6px 14px", fontSize:12, fontFamily:"Calibri,sans-serif", cursor:"pointer", whiteSpace:"nowrap", marginRight:8 }}>Publication Authority →</button>
      </div>

      <div style={{ padding: "28px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── STEP 0 ── */}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 680 }}>
              {[
                ["Property Name", "property", "e.g. O2 Beach Club & Spa", "Exact hotel name — used for citation detection"],
                ["Destination", "destination", "e.g. Barbados", "Fills [destination] in all queries"],
              ].map(([lbl, key, ph, hint]) => (
                <div key={key}>
                  <label style={label}>{lbl}</label>
                  <input style={{ ...inp(), width: "100%", boxSizing: "border-box" }}
                    placeholder={ph} value={config[key]}
                    onChange={e => setConfig(p => ({ ...p, [key]: e.target.value }))} />
                  <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 5 }}>{hint}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, maxWidth: 680 }}>
              <label style={label}>Additional Context (optional)</label>
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
            <button style={{ ...btn(C.teal, C.white, { marginTop: 28 }), opacity: config.property && config.destination ? 1 : 0.4 }}
              disabled={!config.property || !config.destination} onClick={() => setStep(1)}>
              Continue to Personas →
            </button>
          </div>
        )}

        {/* ── STEP 1 ── */}
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
                    <label style={label}>{l}</label>
                    <input style={{ ...inp(), width: "100%", boxSizing: "border-box" }} placeholder={ph}
                      value={newPersona[k]} onChange={e => setNewPersona(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <label style={label}>System Prompt</label>
                  <textarea style={{ ...inp(), width: "100%", boxSizing: "border-box", height: 80, resize: "vertical" }}
                    placeholder="Describe how this persona searches for travel, their priorities and vocabulary…"
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

        {/* ── STEP 2 ── */}
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
              Start Testing ({activeQ.length} active queries across {activePer.length} persona{activePer.length !== 1 ? "s" : ""}) →
            </button>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Running Tests</h2>
                <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 13 }}>
                  All platforms running automatically. Results log to Google Sheets in real time.
                </p>
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
                      {getResult(curPersona.id, curPlatform, curQuery.id) && (
                        <div style={{ marginTop: 8, fontSize: 13, fontFamily: "Calibri,sans-serif", color: getResult(curPersona.id, curPlatform, curQuery.id)?.cited ? C.green : C.red, fontWeight: 700 }}>
                          {getResult(curPersona.id, curPlatform, curQuery.id)?.cited ? `✓ "${config.property}" cited` : `✗ "${config.property}" not cited`}
                        </div>
                      )}
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
                            const r = getResult(curPersona.id, p, q.id);
                            return (
                              <td key={p} style={{ padding: "5px 10px", textAlign: "center" }}>
                                {r === undefined ? <span style={{ color: C.navy3 }}>·</span>
                                  : r.cited ? <span style={{ color: C.green }}>●</span>
                                    : <span style={{ color: C.red }}>●</span>}
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

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Results</h2>
                <p style={{ color: C.greyL, fontFamily: "Calibri,sans-serif", fontSize: 14 }}>
                  Signal Noir™ · {config.property} · {config.destination} · Session {sessionId}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btn(C.gold, C.navy)} onClick={exportCSV}>↓ Export CSV</button>
                <button style={btn(C.navy3, C.greyL, { border: `1px solid ${C.navy3}` })} onClick={() => { setStep(0); setResults({}); setTestState({ personaIdx: 0, platformIdx: 0, queryIdx: 0, phase: "idle" }); }}>
                  New Session
                </button>
              </div>
            </div>

            {activePer.map(per => {
              const total = activeQ.length * PLATFORMS.length;
              const cited = activeQ.flatMap(q => PLATFORMS.map(p => getResult(per.id, p, q.id)?.cited)).filter(Boolean).length;
              const pct = total ? Math.round(cited / total * 100) : 0;

              return (
                <div key={per.id} style={{ ...card({ marginBottom: 24 }) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.navy3}` }}>
                    <span style={{ fontSize: 22 }}>{per.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{per.name}</div>
                      <div style={{ fontSize: 12, color: C.greyL, fontFamily: "Calibri,sans-serif" }}>{per.desc}</div>
                    </div>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: pct >= 75 ? C.teal : pct >= 50 ? C.gold : C.red }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif" }}>{cited}/{total} cited</div>
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
                            const platResults = PLATFORMS.map(p => getResult(per.id, p, q.id));
                            const citedCount = platResults.filter(r => r?.cited).length;
                            return (
                              <tr key={q.id} style={{ borderTop: `1px solid ${C.navy3}` }}>
                                <td style={{ padding: "7px 10px" }}>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                                </td>
                                <td style={{ padding: "7px 12px", color: C.greyL }}>{resolveQ(q.text, config.destination)}</td>
                                {PLATFORMS.map((p, i) => {
                                  const r = platResults[i];
                                  return (
                                    <td key={p} style={{ padding: "7px 10px", textAlign: "center" }}>
                                      {r === undefined
                                        ? <span style={{ color: C.navy3 }}>·</span>
                                        : r.cited
                                          ? <span style={{ fontSize: 15 }}>🟢</span>
                                          : <span style={{ fontSize: 15 }}>🔴</span>}
                                    </td>
                                  );
                                })}
                                <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700, color: citedCount === 4 ? C.green : citedCount >= 2 ? C.gold : citedCount > 0 ? C.greyL : C.red }}>
                                  {citedCount}/4
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
                      const c = activeQ.filter(q => getResult(per.id, p, q.id)?.cited).length;
                      return (
                        <div key={p} style={{ ...card({ padding: "10px 16px", flex: 1, minWidth: 110, textAlign: "center" }) }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: c / activeQ.length >= 0.75 ? C.teal : c / activeQ.length >= 0.5 ? C.gold : C.red }}>
                            {c}/{activeQ.length}
                          </div>
                          <div style={{ fontSize: 11, color: C.grey, fontFamily: "Calibri,sans-serif", marginTop: 2 }}>{p}</div>
                        </div>
                      );
                    })}
                  </div>
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
