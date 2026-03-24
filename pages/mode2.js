import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

const C = {
  navy: "#0D1B2A", navy2: "#142233", navy3: "#1C2E42",
  teal: "#0D9488", tealD: "#0A7A70", tealL: "#5EEAD4",
  gold: "#C9A84C", white: "#FFFFFF", grey: "#64748B", greyL: "#94A3B8",
  green: "#10B981", red: "#EF4444", purple: "#A78BFA",
};

const PLATFORMS = ["Claude", "ChatGPT", "Perplexity", "Gemini"];
const CATEGORIES = ["destination", "experience", "planning"];
const CAT_LABELS = { destination: "Destination", experience: "Experience", planning: "Planning" };
const CAT_COLORS = { destination: C.teal, experience: C.gold, planning: C.purple };

// Personas from shared lib
import { PERSONAS } from "../lib/personas";

const DEFAULT_PUBLICATIONS = [
  "Condé Nast Traveller","OutThere","Elite Traveler","BA High Life",
  "National Geographic Traveller","Centurion & Departures","The Times",
  "The Telegraph","The Financial Times","FT How to Spend It","Country Life",
  "Stylist","Elle","Robb Report","Country & Town House","Tatler","Wallpaper",
  "Vogue","HELLO! Luxe","Harper's Bazaar","Times Luxx Magazine","House & Garden",
  "Livingetc","Spear's","Forbes","Good Housekeeping","Marie Claire","AspireMag","TTG Luxury",
  "The Blend Journal",
];

const DEFAULT_QUERIES = {
  destination: [
    { id:"d1",  text:"Luxury hotel Dubai", active:true },
    { id:"d2",  text:"Desert resort Dubai", active:true },
    { id:"d3",  text:"Ski chalet Courchevel", active:true },
    { id:"d4",  text:"Luxury ski resort Verbier", active:true },
    { id:"d5",  text:"Luxury resort Maldives", active:true },
    { id:"d6",  text:"Private island Maldives", active:true },
    { id:"d7",  text:"Private island Caribbean", active:true },
    { id:"d8",  text:"Luxury hotel Lake Como", active:true },
    { id:"d9",  text:"Luxury hotel Amalfi Coast", active:true },
    { id:"d10", text:"Boutique hotel French Riviera", active:true },
    { id:"d11", text:"Luxury hotel Kyoto", active:true },
    { id:"d12", text:"Luxury safari lodge Tanzania", active:true },
  ],
  experience: [
    { id:"e1",  text:"Private museum tour Paris", active:true },
    { id:"e2",  text:"Private Vatican tour", active:true },
    { id:"e3",  text:"Private cooking class with local chef", active:true },
    { id:"e4",  text:"Wellness retreat", active:true },
    { id:"e5",  text:"Medical wellness program", active:true },
    { id:"e6",  text:"Antarctic expedition cruise", active:true },
    { id:"e7",  text:"Northern lights private charter", active:true },
    { id:"e8",  text:"Heli-skiing British Columbia", active:true },
    { id:"e9",  text:"Venice Simplon Orient Express", active:true },
    { id:"e10", text:"Private safari lodge Botswana", active:true },
  ],
  planning: [
    { id:"p1", text:"Villa with chef and staff Tuscany", active:true },
    { id:"p2", text:"Ski chalet with catering Verbier", active:true },
    { id:"p3", text:"Yacht charter with crew Mediterranean", active:true },
    { id:"p4", text:"Private island resort with butler Maldives", active:true },
    { id:"p5", text:"Multi-generational villa rental", active:true },
    { id:"p6", text:"Family estate rental", active:true },
    { id:"p7", text:"Bespoke tour operators Antarctica", active:true },
    { id:"p8", text:"Private jet charter London to New York", active:true },
  ],
};

const SUGGESTED_QUERIES = {
  destination: [
    "Luxury tented camp Serengeti","Luxury lodge Patagonia","Overwater bungalow Bora Bora",
    "Palazzo hotel Venice","Boutique hotel Santorini","Luxury riad Marrakech",
    "Eco-luxury lodge Costa Rica","Design hotel New York","Safari lodge Botswana",
    "Luxury hotel Bali","Luxury chalet Zermatt","Beach resort Turks and Caicos",
    "Luxury hotel Tokyo","Boutique hotel Lisbon","Luxury resort Tuscany",
    "Mountain lodge Swiss Alps","Luxury hotel Cape Town","Beachfront villa Mykonos",
  ],
  experience: [
    "Private yacht charter Greek islands","Michelin-starred dining Tokyo",
    "Private art collection tour Florence","Truffle hunting Umbria",
    "Polar expedition Svalbard","Hot air balloon Cappadocia",
    "Private island picnic Seychelles","Sommelier-led wine tour Bordeaux",
    "Behind-the-scenes fashion week Paris","Submarine dive Maldives",
    "Private flamenco performance Seville","Night dive Great Barrier Reef",
    "Falconry experience UAE","Horse riding Camargue","Ice hotel stay Sweden",
  ],
  planning: [
    "Honeymoon itinerary Maldives","Solo luxury travel Japan",
    "Women-only wellness retreat Bali","Multi-destination private jet itinerary",
    "Luxury family safari Kenya","Romantic break Paris with private guide",
    "Corporate retreat Tuscany","Bespoke wine tour Burgundy",
    "Luxury spa break UK","Private island hire Caribbean",
    "Adventure honeymoon Patagonia","Cultural luxury tour India",
    "Photography expedition Iceland","Culinary tour Japan","Wellness sabbatical Sri Lanka",
  ],
};

// styles
const btn = (bg=C.teal, col=C.white, extra={}) => ({ background:bg, color:col, border:"none", borderRadius:6, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"Calibri, sans-serif", transition:"opacity 0.15s", ...extra });
const card = (extra={}) => ({ background:C.navy2, border:`1px solid ${C.navy3}`, borderRadius:10, padding:20, ...extra });
const inp = (extra={}) => ({ background:C.navy3, color:C.white, border:`1px solid #1E3A52`, borderRadius:6, padding:"9px 12px", fontSize:13, fontFamily:"Calibri, sans-serif", outline:"none", ...extra });
const lbl = { display:"block", fontSize:11, color:C.greyL, fontFamily:"Calibri, sans-serif", textTransform:"uppercase", letterSpacing:0.5, marginBottom:6, fontWeight:600 };
const tag = (color) => ({ display:"inline-block", background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px", fontSize:11, fontWeight:600, fontFamily:"Calibri, sans-serif" });

function allActive(queries) {
  return CATEGORIES.flatMap(cat => queries[cat].filter(q => q.active));
}

const PUB_URLS = {
  "condé nast traveller": "https://www.cntraveller.com",
  "conde nast traveller": "https://www.cntraveller.com",
  "cntraveller": "https://www.cntraveller.com",
  "outthere": "https://www.outtheremag.com",
  "outthere magazine": "https://www.outtheremag.com",
  "elite traveler": "https://www.elitetraveler.com",
  "elite traveller": "https://www.elitetraveler.com",
  "ba high life": "https://www.ba.com/highlife",
  "national geographic traveller": "https://www.nationalgeographic.co.uk/travel",
  "national geographic traveler": "https://www.nationalgeographic.co.uk/travel",
  "centurion & departures": "https://www.departures.com",
  "departures": "https://www.departures.com",
  "the times": "https://www.thetimes.co.uk",
  "the telegraph": "https://www.telegraph.co.uk",
  "the financial times": "https://www.ft.com",
  "financial times": "https://www.ft.com",
  "ft how to spend it": "https://www.ft.com/htsi",
  "how to spend it": "https://www.ft.com/htsi",
  "ft htsi": "https://www.ft.com/htsi",
  "country life": "https://www.countrylife.co.uk",
  "stylist": "https://www.stylist.co.uk",
  "elle": "https://www.elle.com/uk",
  "robb report": "https://robbreport.com",
  "country & town house": "https://www.countryandtownhouse.com",
  "country and town house": "https://www.countryandtownhouse.com",
  "tatler": "https://www.tatler.com",
  "wallpaper": "https://www.wallpaper.com",
  "wallpaper*": "https://www.wallpaper.com",
  "vogue": "https://www.vogue.co.uk",
  "hello! luxe": "https://www.hellomagazine.com/hubs/luxe",
  "hello luxe": "https://www.hellomagazine.com/hubs/luxe",
  "harper's bazaar": "https://www.harpersbazaar.com/uk",
  "harpers bazaar": "https://www.harpersbazaar.com/uk",
  "times luxx magazine": "https://www.thetimes.co.uk/luxx",
  "times luxx": "https://www.thetimes.co.uk/luxx",
  "house & garden": "https://www.houseandgarden.co.uk",
  "livingetc": "https://www.livingetc.com",
  "spear's": "https://spearswms.com",
  "spears": "https://spearswms.com",
  "forbes": "https://www.forbes.com",
  "good housekeeping": "https://www.goodhousekeeping.com/uk",
  "marie claire": "https://www.marieclaire.co.uk",
  "aspiremag": "https://www.aspiremag.co.uk",
  "aspire": "https://www.aspiremag.co.uk",
  "ttg luxury": "https://www.ttgmedia.com/luxury",
  "the blend journal": "https://theblendjournal.com",
  "blend journal": "https://theblendjournal.com",
  "business traveller": "https://www.businesstraveller.com",
  "robb report": "https://robbreport.com",
  "travel + leisure": "https://www.travelandleisure.com",
  "travel and leisure": "https://www.travelandleisure.com",
  "town & country": "https://www.townandcountrymag.com",
};

function resolveSourceUrl(part) {
  // 1. Explicit http URL in text
  const httpMatch = part.match(/https?:\/\/[^\s)>\]]+/);
  if (httpMatch) return { url: httpMatch[0].replace(/[.,;)]+$/, ''), label: part.replace(httpMatch[0], '').replace(/[()[\]]/g, '').trim() || httpMatch[0] };
  // 2. Known publication name lookup
  const key = part.toLowerCase().replace(/[*]/g, '').trim();
  if (PUB_URLS[key]) return { url: PUB_URLS[key], label: part.trim() };
  // Partial match against known pub names
  for (const [name, url] of Object.entries(PUB_URLS)) {
    if (key.includes(name) || name.includes(key)) return { url, label: part.trim() };
  }
  // 3. Bare domain
  const domainMatch = part.match(/\b([\w-]+\.(com|co\.uk|travel|org|net|io|magazine|media|press)[\w/.-]*)/i);
  if (domainMatch) return { url: `https://${domainMatch[0]}`, label: part.trim() };
  return { url: null, label: part.trim() };
}

function renderSources(sourcesText) {
  if (!sourcesText) return <span style={{ color:"#64748B" }}>—</span>;
  const parts = sourcesText.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return parts.map((part, i) => {
    const { url, label } = resolveSourceUrl(part);
    return (
      <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
        {i > 0 && <span style={{ color:"#1C2E42", margin:"0 6px" }}>·</span>}
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ color:"#5EEAD4", textDecoration:"underline", fontFamily:"Calibri,sans-serif", fontSize:11 }}>
            {label || part}
          </a>
        ) : (
          <span style={{ fontFamily:"Calibri,sans-serif", fontSize:11, color:"#94A3B8" }}>{part}</span>
        )}
      </span>
    );
  });
}

export default function Mode2() {
  const router = useRouter();
  const [tester, setTester] = useState("");
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({ agency:"", vertical:"Luxury Travel", notes:"" });
  const [publications, setPublications] = useState([...DEFAULT_PUBLICATIONS]);
  const [pubInput, setPubInput] = useState(DEFAULT_PUBLICATIONS.join("\n"));
  const [queries, setQueries] = useState(DEFAULT_QUERIES);
  const [activeCategory, setActiveCategory] = useState("destination");
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState("");
  const [progress, setProgress] = useState({ done:0, total:4 });
  const [sessionId] = useState(() => `SN2-${Date.now().toString(36).toUpperCase()}`);
  const [sheetTab, setSheetTab] = useState("");
  const [editQueryId, setEditQueryId] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["Claude","ChatGPT","Perplexity","Gemini"]);
  const [selectedPersonas, setSelectedPersonas] = useState(PERSONAS.map(p => p.id));
  const [batchInput, setBatchInput] = useState("");
  const [showBatch, setShowBatch] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [expandedPub, setExpandedPub] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.name) setTester(d.name);
      else router.push("/");
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout");
    router.push("/");
  }

  const activeQ = allActive(queries);

  function parsePubInput(val) {
    return val.split("\n").map(s => s.trim()).filter(Boolean);
  }

  async function runAllPlatforms() {
    setStep(4);
    setRunning(true);
    const pubs = parsePubInput(pubInput);
    setPublications(pubs);
    const queryTexts = activeQ.map(q => q.text);
    const newResults = {}; // { [personaId]: { [platform]: { counts, queryResults } } }

    const activePlats = selectedPlatforms.length ? selectedPlatforms : PLATFORMS;
    const activePers = PERSONAS.filter(p => selectedPersonas.includes(p.id));
    const total = activePers.length * activePlats.length;
    let done = 0;
    setProgress({ done:0, total });

    for (const persona of activePers) {
      newResults[persona.id] = {};
      for (const platform of activePlats) {
        setCurrentPlatform(`${persona.icon} ${persona.name} · ${platform}`);
        try {
          const res = await fetch("/api/query/mode2", {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ platform, queries: queryTexts, publications: pubs, personaPrompt: persona.prompt, personaTemperature: persona.temperature, personaQueryFraming: persona.queryFraming }),
          });
          const data = await res.json();
          newResults[persona.id][platform] = data;
        } catch(e) {
          newResults[persona.id][platform] = { error: e.message, counts:{}, queryResults:[] };
        }
        done++;
        setResults({...newResults});
        setProgress({ done, total });
      }
    }

    setRunning(false);
    setCurrentPlatform("");

    // Log to sheets (flatten for logging: use first persona or aggregate)
    try {
      const flatResults = {};
      activePlats.forEach(platform => {
        flatResults[platform] = { counts: {}, queryResults: [] };
        activePers.forEach(persona => {
          const pData = newResults[persona.id]?.[platform] || {};
          Object.entries(pData.counts || {}).forEach(([pub, count]) => {
            flatResults[platform].counts[pub] = (flatResults[platform].counts[pub] || 0) + count;
          });
        });
      });
      const res = await fetch("/api/sheets/logmode2", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          agency: config.agency,
          sessionId,
          publications: pubs,
          results: flatResults,
          platforms: activePlats,
          runDate: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (data.tabName) setSheetTab(data.tabName);
    } catch(e) {
      console.error("Sheet log failed:", e);
    }

    setStep(5);
  }

  function exportExcel() {
    const pubs = parsePubInput(pubInput);
    const activePers = PERSONAS.filter(p => selectedPersonas.includes(p.id));
    const activePlats = selectedPlatforms.length ? selectedPlatforms : PLATFORMS;
    const getCount = (pub, platform) => activePers.reduce((sum, per) => sum + (results[per.id]?.[platform]?.counts?.[pub] || 0), 0);
    const maxTotal = activePers.length * activePlats.length * activeQ.length;

    const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const cell = (v, type='String') => `<Cell><Data ss:Type="${type}">${esc(v)}</Data></Cell>`;
    const row = cells => `<Row>${cells.join('')}</Row>`;
    const sheet = (name, rows) => `<Worksheet ss:Name="${esc(name)}"><Table>${rows.join('')}</Table></Worksheet>`;

    // Sheet 1: Publications
    const pubHeader = row([cell('Publication'), ...activePlats.map(p => cell(p)), cell('Total'), cell('Citation Rate %')]);
    const pubRows = [pubHeader, ...pubs.map(pub => {
      const counts = activePlats.map(p => getCount(pub, p));
      const total = counts.reduce((a,b)=>a+b,0);
      const rate = maxTotal > 0 ? Math.round(total/maxTotal*100) : 0;
      return row([cell(pub), ...counts.map(c => cell(c,'Number')), cell(total,'Number'), cell(rate+'%')]);
    })];

    // Sheet 2: By Query — one row per query × platform × persona
    const qHeader = row([cell('Query'), cell('Platform'), cell('Persona'), cell('Sources Cited'), cell('URLs')]);
    const qRows = [qHeader];
    activePers.forEach(persona => {
      activePlats.forEach(platform => {
        const qrs = results[persona.id]?.[platform]?.queryResults || [];
        qrs.forEach(qr => {
          if (!qr.query) return;
          const urls = (qr.sources || '').match(/https?:\/\/[^\s)>,;\]]+/g) || [];
          qRows.push(row([
            cell(qr.query),
            cell(platform),
            cell(`${persona.icon} ${persona.name}`),
            cell(qr.sources || ''),
            cell(urls.join(' | ')),
          ]));
        });
      });
    });

    // Sheet 3: URLs by Publication — for each cited publication, list every URL found
    // in query results where that publication was cited, matched by domain
    const buildDomain = pub => {
      const key = pub.toLowerCase().replace(/[*]/g,'').trim();
      const base = PUB_URLS[key] || Object.entries(PUB_URLS).find(([k]) => key.includes(k) || k.includes(key))?.[1];
      try { return base ? new URL(base).hostname.replace(/^www\./,'') : null; } catch { return null; }
    };
    const urlHeader = row([cell('Publication'), cell('URL'), cell('Query'), cell('Platform'), cell('Persona')]);
    const urlRows = [urlHeader];
    // Collect unique pub+url combinations to avoid duplicates
    const seen = new Set();
    // Sort pubs so they group together
    pubs.forEach(pub => {
      const domain = buildDomain(pub);
      activePers.forEach(persona => {
        activePlats.forEach(platform => {
          const qrs = results[persona.id]?.[platform]?.queryResults || [];
          qrs.forEach(qr => {
            if (!(qr.cited || []).includes(pub)) return;
            const allUrls = (qr.sources || '').match(/https?:\/\/[^\s)>,;\]"]+/g) || [];
            const clean = u => u.replace(/[.,;)"]+$/, '');
            // Prefer URLs matching this publication's domain; fall back to all URLs if none match
            const matched = domain ? allUrls.filter(u => u.toLowerCase().includes(domain)) : [];
            const toAdd = matched.length ? matched : allUrls;
            toAdd.forEach(rawUrl => {
              const u = clean(rawUrl);
              const key = `${pub}||${u}`;
              if (seen.has(key)) return;
              seen.add(key);
              urlRows.push(row([
                cell(pub),
                cell(u),
                cell(qr.query),
                cell(platform),
                cell(`${persona.icon} ${persona.name}`),
              ]));
            });
          });
        });
      });
    });

    const xml = [
      '<?xml version="1.0"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      sheet('Publications', pubRows),
      sheet('By Query', qRows),
      sheet('URLs by Publication', urlRows),
      '</Workbook>',
    ].join('\n');

    const blob = new Blob([xml], { type:'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-noir-${config.agency.replace(/\s+/g,'-')}-${sessionId}.xls`;
    a.click();
  }

  const steps = ["Project Setup","Publications","Personas","Queries","Running","Results"];

  return (
    <div style={{ background:C.navy, minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ background:C.navy2, borderBottom:`1px solid ${C.navy3}`, padding:"0 28px", display:"flex", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0", flex:1 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal, boxShadow:`0 0 8px ${C.teal}` }}/>
          <span style={{ fontSize:15, fontWeight:700, letterSpacing:2 }}>SIGNAL NOIR™</span>
          <span style={{ ...tag(C.purple), fontSize:10, marginLeft:4 }}>PUBLICATION AUTHORITY</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => router.push("/dashboard")} style={btn(C.navy3, C.greyL, { border:`1px solid ${C.navy3}`, fontSize:12, padding:"6px 14px" })}>
            ← Property Mode
          </button>
          {tester && <span style={tag(C.teal)}>🧑 {tester}</span>}
          <button onClick={logout} style={btn(C.navy3, C.greyL, { fontSize:12, padding:"6px 14px", border:`1px solid ${C.navy3}` })}>Sign out</button>
        </div>
      </div>

      {/* Step tabs */}
      <div style={{ background:C.navy2, borderBottom:`1px solid ${C.navy3}`, padding:"0 28px", display:"flex" }}>
        {steps.map((label,i) => (
          <button key={i} onClick={() => i < step && setStep(i)}
            style={{ background:"none", border:"none", borderBottom: step===i ? `2px solid ${C.purple}` : "2px solid transparent", color: step===i ? C.purple : i<step ? C.greyL : C.grey, padding:"12px 20px", fontSize:12, fontFamily:"Calibri,sans-serif", fontWeight:600, cursor: i<step?"pointer":"default", letterSpacing:0.5 }}>
            {i+1}. {label}
          </button>
        ))}
      </div>

      <div style={{ padding:"28px", maxWidth:1100, margin:"0 auto" }}>

        {/* STEP 0 — Setup */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Publication Authority Setup</h2>
            <p style={{ color:C.greyL, fontFamily:"Calibri,sans-serif", fontSize:14, marginBottom:24 }}>
              Measure which publications AI platforms cite when answering luxury travel queries — for a specific agency and their target media.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:680 }}>
              <div>
                <label style={lbl}>Agency / Client Name</label>
                <input style={{ ...inp(), width:"100%", boxSizing:"border-box" }}
                  placeholder="e.g. Spotlight Communications"
                  value={config.agency} onChange={e => setConfig(p=>({...p,agency:e.target.value}))} />
                <div style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif", marginTop:5 }}>Used to name the Google Sheet tab</div>
              </div>
              <div>
                <label style={lbl}>Vertical</label>
                <input style={{ ...inp(), width:"100%", boxSizing:"border-box" }}
                  placeholder="e.g. Luxury Travel, Superyacht, Fine Dining"
                  value={config.vertical} onChange={e => setConfig(p=>({...p,vertical:e.target.value}))} />
              </div>
            </div>
            <div style={{ marginTop:20, maxWidth:680 }}>
              <label style={lbl}>Notes (optional)</label>
              <textarea style={{ ...inp(), width:"100%", boxSizing:"border-box", height:70, resize:"vertical" }}
                placeholder="e.g. Spotlight Whitepaper 2026 — 29 target publications, luxury travel vertical"
                value={config.notes} onChange={e => setConfig(p=>({...p,notes:e.target.value}))} />
            </div>
            {/* Platform selector */}
            <div style={{ marginTop:24, maxWidth:680 }}>
              <label style={{ display:"block", fontSize:11, color:C.greyL, fontFamily:"Calibri,sans-serif", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10, fontWeight:600 }}>Platforms to Test</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {["Claude","ChatGPT","Perplexity","Gemini"].map(p => {
                  const on = selectedPlatforms.includes(p);
                  const cols = { Claude:C.teal, ChatGPT:C.green, Perplexity:"#F97316", Gemini:C.gold };
                  const col = cols[p];
                  return (
                    <div key={p} onClick={() => setSelectedPlatforms(prev => on && prev.length>1 ? prev.filter(x=>x!==p) : on ? prev : [...prev,p])}
                      style={{ padding:"8px 18px", borderRadius:6, cursor:"pointer", border:`1px solid ${on?col:C.navy3}`, background:on?`${col}22`:"none", color:on?col:C.grey, fontSize:13, fontFamily:"Calibri,sans-serif", fontWeight:600, transition:"all 0.15s", display:"flex", alignItems:"center", gap:6 }}>
                      {on && <span>✓</span>}{p}
                      {p==="Perplexity" && <span style={{ fontSize:10, color:C.grey }}>†</span>}
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
            <button style={{ ...btn(C.teal, C.white, {marginTop:28}), opacity: config.agency ? 1 : 0.4 }}
              disabled={!config.agency} onClick={() => setStep(1)}>
              Continue to Publications →
            </button>
          </div>
        )}

        {/* STEP 1 — Publications */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Target Publications</h2>
            <p style={{ color:C.greyL, fontFamily:"Calibri,sans-serif", fontSize:14, marginBottom:20 }}>
              Enter one publication per line. The tool will scan every AI response for mentions of these titles.
              Pre-loaded with the Spotlight whitepaper publication list — edit as needed for each client.
            </p>
            <div style={{ maxWidth:680 }}>
              <label style={lbl}>Publications (one per line)</label>
              <textarea style={{ ...inp(), width:"100%", boxSizing:"border-box", height:400, resize:"vertical", lineHeight:1.8, fontSize:12 }}
                value={pubInput} onChange={e => setPubInput(e.target.value)} />
              <div style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif", marginTop:8 }}>
                {parsePubInput(pubInput).length} publications · Tool will scan all AI responses for these names
              </div>
              {parsePubInput(pubInput).some(p => p.startsWith('http')) && (
                <div style={{ marginTop:8, fontSize:11, color:C.gold, fontFamily:"Calibri,sans-serif", background:`${C.gold}11`, border:`1px solid ${C.gold}33`, borderRadius:6, padding:"8px 12px" }}>
                  ⚠ Some entries look like URLs. The tool can match on domain names, but AI responses cite publication names — use names like "The Times" or "HELLO! Luxe" for the most reliable matching.
                </div>
              )}
            </div>
            <button style={{ ...btn(C.teal, C.white, {marginTop:24}), opacity: parsePubInput(pubInput).length ? 1 : 0.4 }}
              disabled={!parsePubInput(pubInput).length} onClick={() => setStep(2)}>
              Continue to Personas ({parsePubInput(pubInput).length} publications) →
            </button>
          </div>
        )}

        {/* STEP 2 — Personas */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Audience Personas</h2>
            <p style={{ color:C.greyL, fontFamily:"Calibri,sans-serif", fontSize:14, marginBottom:24 }}>
              Each persona simulates a different reader type. Queries run through each selected persona's system prompt.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14, marginBottom:28 }}>
              {PERSONAS.map(p => {
                const on = selectedPersonas.includes(p.id);
                return (
                  <div key={p.id} onClick={() => setSelectedPersonas(prev => on ? prev.filter(x=>x!==p.id) : [...prev,p.id])}
                    style={{ ...card(), cursor:"pointer", border:`1px solid ${on?C.teal:C.navy3}`, background:on?`${C.teal}18`:C.navy2, transition:"all 0.15s", position:"relative" }}>
                    {on && <div style={{ position:"absolute", top:10, right:12, color:C.teal, fontSize:16, fontWeight:700 }}>✓</div>}
                    <div style={{ fontSize:24, marginBottom:8 }}>{p.icon}</div>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:C.greyL, fontFamily:"Calibri,sans-serif", lineHeight:1.5 }}>{p.desc}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}>
              <button style={{ ...btn(C.teal), opacity: selectedPersonas.length ? 1 : 0.4 }}
                disabled={!selectedPersonas.length} onClick={() => setStep(3)}>
                Continue to Queries ({selectedPersonas.length} persona{selectedPersonas.length!==1?"s":""}) →
              </button>
              <span style={{ fontSize:12, color:C.grey, fontFamily:"Calibri,sans-serif" }}>
                ~{selectedPersonas.length * (selectedPlatforms.length||4) * activeQ.length} total tests
              </span>
            </div>
          </div>
        )}

        {/* STEP 3 — Queries */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Edit Queries</h2>
            <p style={{ color:C.greyL, fontFamily:"Calibri,sans-serif", fontSize:14, marginBottom:20 }}>
              Pre-loaded with the 30 Spotlight whitepaper queries. Toggle, edit, or add for each client vertical.
            </p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ display:"flex", gap:0 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setActiveCategory(cat); setShowBatch(false); setBatchInput(""); setShowSuggested(false); }} style={{
                    background: activeCategory===cat ? `${CAT_COLORS[cat]}22` : "none",
                    border: activeCategory===cat ? `1px solid ${CAT_COLORS[cat]}66` : `1px solid ${C.navy3}`,
                    color: activeCategory===cat ? CAT_COLORS[cat] : C.greyL,
                    padding:"8px 20px", fontSize:12, fontFamily:"Calibri,sans-serif", fontWeight:600, cursor:"pointer", letterSpacing:0.5,
                    borderRadius: cat==="destination" ? "6px 0 0 6px" : cat==="planning" ? "0 6px 6px 0" : "0",
                  }}>
                    {CAT_LABELS[cat].toUpperCase()} ({queries[cat].filter(q=>q.active).length})
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setQueries(prev => ({...prev, [activeCategory]: []}))}
                  style={{ ...btn("none", C.grey, {border:`1px solid ${C.navy3}`, fontSize:11, padding:"5px 12px"}) }}>
                  Clear {CAT_LABELS[activeCategory]}
                </button>
                <button onClick={() => setQueries({ destination:[], experience:[], planning:[] })}
                  style={{ ...btn("none", "#e05252", {border:`1px solid #e0525244`, fontSize:11, padding:"5px 12px"}) }}>
                  Clear all
                </button>
                <button onClick={() => setQueries(DEFAULT_QUERIES)}
                  style={{ ...btn("none", C.teal, {border:`1px solid ${C.teal}44`, fontSize:11, padding:"5px 12px"}) }}>
                  ↺ Reset to defaults
                </button>
              </div>
            </div>
            <div style={{ maxWidth:680 }}>
              {queries[activeCategory].map((q,i) => (
                <div key={q.id} style={{ ...card({marginBottom:8, display:"flex", alignItems:"center", gap:12}), border:`1px solid ${q.active ? CAT_COLORS[activeCategory]+"44" : C.navy3}`, opacity: q.active?1:0.5 }}>
                  <div onClick={() => setQueries(prev => ({...prev, [activeCategory]: prev[activeCategory].map((qq,j) => j===i ? {...qq,active:!qq.active} : qq)}))}
                    style={{ width:20, height:20, borderRadius:4, border:`2px solid ${q.active?CAT_COLORS[activeCategory]:C.grey}`, background:q.active?CAT_COLORS[activeCategory]:"none", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {q.active && <span style={{ fontSize:12, color:C.white, fontWeight:700 }}>✓</span>}
                  </div>
                  {editQueryId === q.id ? (
                    <input autoFocus style={{ ...inp(), flex:1 }} value={q.text}
                      onChange={e => setQueries(prev => ({...prev, [activeCategory]: prev[activeCategory].map((qq,j) => j===i ? {...qq,text:e.target.value} : qq)}))}
                      onBlur={() => setEditQueryId(null)} onKeyDown={e => e.key==="Enter" && setEditQueryId(null)} />
                  ) : (
                    <span style={{ flex:1, fontSize:13, fontFamily:"Calibri,sans-serif" }}>{q.text}</span>
                  )}
                  <button onClick={() => setEditQueryId(q.id)} style={{ background:"none", border:"none", color:C.grey, cursor:"pointer", fontSize:14 }}>✏️</button>
                </div>
              ))}
              <button onClick={() => {
                const id = activeCategory[0]+Date.now();
                setQueries(prev => ({...prev, [activeCategory]: [...prev[activeCategory], {id, text:"", active:true}]}));
                setTimeout(() => setEditQueryId(id), 50);
              }} style={{ ...btn("none", C.greyL, {border:`1px dashed ${C.grey}`, marginTop:8}) }}>+ Add query</button>
              <button onClick={() => { setShowBatch(b => !b); setBatchInput(""); }} style={{ ...btn("none", C.gold, {border:`1px dashed ${C.gold}66`, marginTop:8, marginLeft:8}) }}>
                {showBatch ? "✕ Cancel batch" : "+ Add query batch"}
              </button>
              {showBatch && (
                <div style={{ marginTop:12, background:C.navy2, border:`1px solid ${C.gold}44`, borderRadius:8, padding:16 }}>
                  <p style={{ fontSize:12, color:C.greyL, fontFamily:"Calibri,sans-serif", marginBottom:8 }}>
                    Paste queries below — one per line. All will be added to <strong style={{color:CAT_COLORS[activeCategory]}}>{CAT_LABELS[activeCategory]}</strong>.
                  </p>
                  <textarea
                    autoFocus
                    value={batchInput}
                    onChange={e => setBatchInput(e.target.value)}
                    placeholder={"Luxury hotel Rome\nBeachfront villa Mykonos\nSki resort Aspen"}
                    style={{ width:"100%", minHeight:140, background:C.navy3, border:`1px solid ${C.navy3}`, color:C.white, borderRadius:6, padding:"10px 12px", fontSize:13, fontFamily:"Calibri,sans-serif", resize:"vertical", boxSizing:"border-box" }}
                  />
                  <button
                    onClick={() => {
                      const lines = batchInput.split("\n").map(s => s.trim()).filter(Boolean);
                      if (!lines.length) return;
                      const now = Date.now();
                      const newQ = lines.map((text, i) => ({ id: activeCategory[0]+now+i, text, active:true }));
                      setQueries(prev => ({...prev, [activeCategory]: [...prev[activeCategory], ...newQ]}));
                      setBatchInput("");
                      setShowBatch(false);
                    }}
                    style={{ ...btn(C.gold, C.navy, {marginTop:10}) }}
                  >
                    Add {batchInput.split("\n").filter(s=>s.trim()).length || 0} quer{batchInput.split("\n").filter(s=>s.trim()).length===1?"y":"ies"}
                  </button>
                </div>
              )}
              <button onClick={() => { setShowSuggested(s => !s); setShowBatch(false); setBatchInput(""); }}
                style={{ ...btn("none", C.purple, {border:`1px dashed ${C.purple}66`, marginTop:8, marginLeft:8}) }}>
                {showSuggested ? "✕ Hide suggestions" : "✦ Suggested"}
              </button>
              {showSuggested && (
                <div style={{ marginTop:12, background:C.navy2, border:`1px solid ${C.purple}44`, borderRadius:8, padding:16 }}>
                  <p style={{ fontSize:12, color:C.greyL, fontFamily:"Calibri,sans-serif", marginBottom:12 }}>
                    Click any suggestion to add it instantly to <strong style={{color:CAT_COLORS[activeCategory]}}>{CAT_LABELS[activeCategory]}</strong>.
                  </p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {SUGGESTED_QUERIES[activeCategory]
                      .filter(s => !queries[activeCategory].some(q => q.text.toLowerCase() === s.toLowerCase()))
                      .map(s => (
                        <button key={s} onClick={() => {
                          const id = activeCategory[0]+Date.now()+Math.random();
                          setQueries(prev => ({...prev, [activeCategory]: [...prev[activeCategory], {id, text:s, active:true}]}));
                        }}
                          style={{ background:C.navy3, border:`1px solid ${C.purple}44`, color:C.greyL, borderRadius:20, padding:"5px 14px", fontSize:12, fontFamily:"Calibri,sans-serif", cursor:"pointer" }}>
                          + {s}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop:28, display:"flex", alignItems:"center", gap:14 }}>
              <button style={btn(C.teal)} onClick={runAllPlatforms}>
                Run {selectedPlatforms.length} Platform{selectedPlatforms.length!==1?'s':''} × {selectedPersonas.length} Persona{selectedPersonas.length!==1?'s':''} ({activeQ.length} queries each) →
              </button>
              <span style={{ fontSize:12, color:C.grey, fontFamily:"Calibri,sans-serif" }}>
                {selectedPersonas.length * selectedPlatforms.length * activeQ.length} total tests
              </span>
            </div>
          </div>
        )}

        {/* STEP 4 — Running */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Running Publication Authority Tests</h2>
            <p style={{ color:C.greyL, fontFamily:"Calibri,sans-serif", fontSize:13, marginBottom:28 }}>
              Running {activeQ.length} queries across {selectedPersonas.length} persona{selectedPersonas.length!==1?"s":""} × {selectedPlatforms.length} platform{selectedPlatforms.length!==1?"s":""}. Each platform returns a source table scanned for your {parsePubInput(pubInput).length} target publications.
            </p>
            {currentPlatform && (
              <div style={{ ...card({marginBottom:20, padding:"12px 18px", display:"flex", alignItems:"center", gap:12}), border:`1px solid ${C.gold}44` }}>
                <div style={{ width:14, height:14, border:`2px solid ${C.gold}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }}/>
                <span style={{ fontSize:13, color:C.gold, fontFamily:"Calibri,sans-serif" }}>Running: {currentPlatform}</span>
              </div>
            )}
            <div style={{ width:"100%", maxWidth:500, height:8, background:C.navy3, borderRadius:4, marginBottom:10 }}>
              <div style={{ width:`${progress.total>0?progress.done/progress.total*100:0}%`, height:8, background:C.teal, borderRadius:4, transition:"width 0.4s" }}/>
            </div>
            <div style={{ fontSize:12, color:C.grey, fontFamily:"Calibri,sans-serif", marginBottom:24 }}>{progress.done}/{progress.total} complete</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {PERSONAS.filter(p => selectedPersonas.includes(p.id)).map(persona => (
                selectedPlatforms.map(platform => {
                  const resultData = results[persona.id]?.[platform];
                  const isDone = !!resultData;
                  const hasError = !!resultData?.error;
                  const isActive = currentPlatform === `${persona.icon} ${persona.name} · ${platform}`;
                  return (
                    <div key={`${persona.id}-${platform}`} title={hasError ? resultData.error : undefined}
                      style={{ ...card({padding:"8px 14px"}), fontSize:11, fontFamily:"Calibri,sans-serif",
                      border:`1px solid ${hasError?"#e05252":isDone?C.teal:isActive?C.gold:C.navy3}`, color:hasError?"#e05252":isDone?C.tealL:isActive?C.gold:C.grey }}>
                      {hasError?"✗ ":isDone?"✓ ":isActive?"⟳ ":""}{persona.icon} {persona.name} · {platform}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        )}

        {/* STEP 5 — Results */}
        {step === 5 && (
          <div>
            {(() => {
              const activePers = PERSONAS.filter(p => selectedPersonas.includes(p.id));
              const activePlats = selectedPlatforms.length ? selectedPlatforms : PLATFORMS;
              const getCount = (pub, platform) => activePers.reduce((sum, per) => sum + (results[per.id]?.[platform]?.counts?.[pub] || 0), 0);
              const maxPerPlatform = activePers.length * activeQ.length;
              const maxTotal = activePers.length * activePlats.length * activeQ.length;
              const pubs = parsePubInput(pubInput);
              return (<>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Publication Authority Results</h2>
                <p style={{ color:C.greyL, fontFamily:"Calibri,sans-serif", fontSize:13 }}>
                  Signal Noir™ · {config.agency} · {activeQ.length} queries · {activePers.length} personas · {pubs.length} publications · Session {sessionId}
                </p>
                {sheetTab && (
                  <div style={{ marginTop:6, fontSize:12, fontFamily:"Calibri,sans-serif", color:C.teal }}>
                    ✓ Written to Google Sheet tab: "{sheetTab}"
                  </div>
                )}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button style={btn(C.gold, C.navy)} onClick={exportExcel}>↓ Export Excel</button>
                <button style={btn(C.navy3, C.greyL, {border:`1px solid ${C.navy3}`})} onClick={() => { setStep(0); setResults({}); }}>New Session</button>
              </div>
            </div>

            {/* Publication scores table */}
            <div style={{ ...card({marginBottom:24}), overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%", fontSize:12, fontFamily:"Calibri,sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom:`2px solid ${C.navy3}` }}>
                    <th style={{ textAlign:"left", padding:"10px 14px", color:C.greyL, fontWeight:600, minWidth:200 }}>Publication</th>
                    {activePlats.map(p => (
                      <th key={p} style={{ padding:"10px 14px", color:C.greyL, fontWeight:600, textAlign:"center", minWidth:120 }}>
                        {p}<br/>
                        <span style={{ fontSize:10, fontWeight:400 }}>(0–{maxPerPlatform})</span>
                      </th>
                    ))}
                    <th style={{ padding:"10px 14px", color:C.greyL, fontWeight:600, textAlign:"center" }}>Total<br/><span style={{ fontSize:10, fontWeight:400 }}>(0–{maxTotal})</span></th>
                    <th style={{ padding:"10px 14px", color:C.greyL, fontWeight:600, textAlign:"center" }}>Citation<br/>Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {pubs.map(pub => {
                    const counts = activePlats.map(p => getCount(pub, p));
                    const total = counts.reduce((a,b)=>a+b,0);
                    const rate = maxTotal > 0 ? Math.round(total/maxTotal*100) : 0;
                    const hasAnyCitation = total > 0;
                    const isExpanded = expandedPub === pub;

                    // Collect all source entries where this pub was cited
                    const citationDetails = [];
                    activePers.forEach(persona => {
                      activePlats.forEach(platform => {
                        const qrs = results[persona.id]?.[platform]?.queryResults || [];
                        qrs.forEach(qr => {
                          if (qr.cited?.includes(pub)) {
                            citationDetails.push({ persona: persona.name, icon: persona.icon, platform, query: qr.query, sources: qr.sources });
                          }
                        });
                      });
                    });

                    return (<>
                      <tr key={pub} onClick={() => hasAnyCitation && setExpandedPub(isExpanded ? null : pub)}
                        style={{ borderTop:`1px solid ${C.navy3}`, background: isExpanded ? `${C.teal}14` : hasAnyCitation ? `${C.teal}08` : "none", cursor: hasAnyCitation ? "pointer" : "default" }}>
                        <td style={{ padding:"9px 14px", color: hasAnyCitation ? C.white : C.greyL, fontWeight: hasAnyCitation ? 600 : 400 }}>
                          {hasAnyCitation && <span style={{ fontSize:10, color:C.teal, marginRight:6 }}>{isExpanded ? "▾" : "▸"}</span>}
                          {pub}
                        </td>
                        {counts.map((c,i) => (
                          <td key={i} style={{ padding:"9px 14px", textAlign:"center", color: c>0?C.tealL:C.grey, fontWeight: c>0?700:400 }}>
                            {c > 0 ? c : "–"}
                          </td>
                        ))}
                        <td style={{ padding:"9px 14px", textAlign:"center", fontWeight:700, color: total>0?C.gold:C.grey }}>{total > 0 ? total : "–"}</td>
                        <td style={{ padding:"9px 14px", textAlign:"center", fontWeight:700, color: rate>=20?C.green:rate>=10?C.gold:rate>0?C.greyL:C.grey }}>
                          {rate > 0 ? `${rate}%` : "–"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={pub+"-detail"}>
                          <td colSpan={activePlats.length + 3} style={{ padding:"0 14px 16px", background:`${C.teal}08` }}>
                            <div style={{ borderTop:`1px solid ${C.teal}22`, paddingTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                              {citationDetails.map((d, i) => (
                                <div key={i} style={{ background:C.navy2, borderRadius:6, padding:"10px 14px", border:`1px solid ${C.navy3}` }}>
                                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                                    <span style={{ fontSize:11, color:C.teal, fontFamily:"Calibri,sans-serif", fontWeight:600 }}>{d.platform}</span>
                                    <span style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif" }}>·</span>
                                    <span style={{ fontSize:11, color:C.greyL, fontFamily:"Calibri,sans-serif" }}>{d.icon} {d.persona}</span>
                                    <span style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif" }}>·</span>
                                    <span style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif", fontStyle:"italic" }}>"{d.query}"</span>
                                  </div>
                                  <div style={{ lineHeight:1.8, wordBreak:"break-word", flexWrap:"wrap", display:"flex", alignItems:"center", gap:2 }}>{renderSources(d.sources)}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>);
                  })}
                </tbody>
              </table>
            </div>

            {/* Platform summaries */}
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${activePlats.length},1fr)`, gap:14, marginBottom:24 }}>
              {activePlats.map(p => {
                const totalCitations = pubs.reduce((sum, pub) => sum + getCount(pub, p), 0);
                const pubsCited = pubs.filter(pub => getCount(pub, p) > 0).length;
                return (
                  <div key={p} style={{ ...card({textAlign:"center"}) }}>
                    <div style={{ fontSize:22, fontWeight:700, color:C.teal }}>{totalCitations}</div>
                    <div style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif" }}>total citations</div>
                    <div style={{ fontSize:15, fontWeight:700, marginTop:8 }}>{p}</div>
                    <div style={{ fontSize:11, color:C.greyL, fontFamily:"Calibri,sans-serif", marginTop:4 }}>{pubsCited}/{pubs.length} pubs cited</div>
                  </div>
                );
              })}
            </div>

            {/* Platform diagnostics — shown for any platform with zero citations */}
            {activePlats.some(p => pubs.reduce((sum, pub) => sum + getCount(pub, p), 0) === 0) && (
              <div style={{ ...card({marginBottom:24}), border:`1px solid #e0525244` }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#e05252", marginBottom:12 }}>⚠ Platform Diagnostics — platforms with 0 citations</div>
                {activePlats.filter(p => pubs.reduce((sum, pub) => sum + getCount(pub, p), 0) === 0).map(p => {
                  // grab first persona's response for this platform
                  const firstPersona = activePers[0];
                  const d = results[firstPersona?.id]?.[p];
                  return (
                    <div key={p} style={{ marginBottom:12, background:C.navy3, borderRadius:6, padding:12 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.greyL, marginBottom:6 }}>{p}</div>
                      {d?.error ? (
                        <div style={{ fontSize:11, color:"#e05252", fontFamily:"Calibri,sans-serif" }}>Error: {d.error}</div>
                      ) : d?.text ? (
                        <>
                          <div style={{ fontSize:11, color:C.gold, fontFamily:"Calibri,sans-serif", marginBottom:6 }}>Response received but 0 citations matched. Raw output (first 1500 chars):</div>
                          <pre style={{ fontSize:10, color:C.greyL, fontFamily:"monospace", whiteSpace:"pre-wrap", wordBreak:"break-all", maxHeight:300, overflowY:"auto", background:C.navy, borderRadius:4, padding:8 }}>{d.text.slice(0, 1500)}</pre>
                        </>
                      ) : (
                        <div style={{ fontSize:11, color:C.grey, fontFamily:"Calibri,sans-serif" }}>No response data — {JSON.stringify(d)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top cited publications highlight */}
            {(() => {
              const ranked = pubs
                .map(pub => ({ pub, total: activePlats.reduce((sum,p) => sum+getCount(pub,p),0) }))
                .filter(x => x.total > 0)
                .sort((a,b) => b.total-a.total)
                .slice(0,5);
              return ranked.length > 0 ? (
                <div style={{ ...card({marginBottom:24}) }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:14, color:C.gold }}>⭐ Most Cited Publications</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    {ranked.map(({pub, total}, i) => (
                      <div key={pub} style={{ ...card({padding:"10px 16px"}), border:`1px solid ${C.gold}44`, display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:18, fontWeight:700, color:C.gold }}>{i+1}</span>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700 }}>{pub}</div>
                          <div style={{ fontSize:11, color:C.greyL, fontFamily:"Calibri,sans-serif" }}>{total} citations across all platforms & personas</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            {/* Per-query source breakdown */}
            {(() => {
              // Collect all queries that ran, with all sources cited across all personas & platforms
              const queryMap = {};
              activePers.forEach(persona => {
                activePlats.forEach(platform => {
                  const qrs = results[persona.id]?.[platform]?.queryResults || [];
                  qrs.forEach(qr => {
                    if (!qr.query) return;
                    if (!queryMap[qr.query]) queryMap[qr.query] = { totalCitations: 0, sources: [] };
                    queryMap[qr.query].totalCitations += (qr.cited?.length || 0);
                    if (qr.sources) queryMap[qr.query].sources.push({ platform, persona: persona.name, icon: persona.icon, sources: qr.sources });
                  });
                });
              });
              const queryEntries = Object.entries(queryMap).filter(([,v]) => v.sources.length > 0);
              if (!queryEntries.length) return null;
              return (
                <div style={{ ...card({marginBottom:24}) }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:16, color:C.purple }}>📋 All Sources by Query</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {queryEntries.map(([query, data]) => (
                      <div key={query} style={{ background:C.navy3, borderRadius:8, padding:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:C.white }}>{query}</div>
                          <div style={{ fontSize:11, color:C.gold, fontFamily:"Calibri,sans-serif", whiteSpace:"nowrap", marginLeft:12 }}>{data.totalCitations} citation{data.totalCitations!==1?"s":""}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {data.sources.map((s, i) => (
                            <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                              <span style={{ fontSize:10, color:C.teal, fontFamily:"Calibri,sans-serif", fontWeight:600, minWidth:60, flexShrink:0 }}>{s.platform}</span>
                              <span style={{ fontSize:10, color:C.greyL, fontFamily:"Calibri,sans-serif", minWidth:140, flexShrink:0 }}>{s.icon} {s.persona}</span>
                              <div style={{ flexWrap:"wrap", display:"flex", alignItems:"center", gap:2 }}>{renderSources(s.sources)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
              </>);
            })()}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  );
}
