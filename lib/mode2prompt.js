export const MODE2_SYSTEM_PROMPT = `You are a luxury travel expert. Answer each query as you would for a real high-net-worth traveller seeking genuine recommendations. Be specific, authoritative, and draw on real editorial sources.`;

export const MODE2_USER_PROMPT = (queries, queryFraming, publications) => `${queryFraming ? `${queryFraming}\n\n` : ""}Answer each luxury travel query below. Treat each query as a fresh, independent search — cite the full breadth of sources you would draw on for that specific question. Prioritise established editorial publications and media, particularly: ${publications && publications.length ? publications.join(', ') : 'Condé Nast Traveller, Tatler, Vogue, Harper\'s Bazaar, Robb Report, FT How to Spend It, The Times, The Telegraph, Forbes, Elle'}.

For each query provide:
1. A brief answer (2-3 sentences)
2. Every source cited — include the publication or website name AND its full URL (e.g. Condé Nast Traveller (https://www.cntraveller.com/article/...), The Times (https://www.thetimes.co.uk/article/...)). List all sources used, not just the headline ones.

Return ONLY as a markdown table with these exact columns:
| Query # | Query | Brief Answer (2–3 sentences) | Sources Cited (Name and full URL for each source) |

Do not add any text before or after the table. Do not wrap the table in code blocks or markdown fences.

Queries:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;

// Derive a set of match terms from a publication entry.
// Handles both plain names ("The Times") and URLs ("https://www.thetimes.com/magazines/luxx").
function getMatchTerms(pub) {
  const trimmed = pub.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      // hostname without www → e.g. "thetimes.com"
      const hostname = url.hostname.replace(/^www\./, '');
      // root domain word → e.g. "thetimes"
      const rootDomain = hostname.split('.')[0];
      // meaningful path segments (skip short ones like "en", "uk")
      const pathTerms = url.pathname.split('/').map(s => s.toLowerCase()).filter(s => s.length > 2);
      return [hostname, rootDomain, ...pathTerms];
    } catch {
      // malformed URL — fall through to name matching below
    }
  }

  // Plain publication name: match as-is + alphanum-only variant
  const alphaNum = lower.replace(/[^a-z0-9]/g, '');
  return [lower, alphaNum].filter(Boolean);
}

export function parseTableResponse(text, publications) {
  // Pre-compute match terms for each publication once
  const pubTerms = publications.map(pub => ({ pub, terms: getMatchTerms(pub) }));

  // Strip markdown code fences (Gemini often wraps tables in ```markdown ... ```)
  const cleaned = text.replace(/^```[a-z]*\n?/gm, '').replace(/^```\s*$/gm, '');

  // Extract table rows
  const lines = cleaned.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---'));
  const rows = lines.slice(1); // skip header row

  const counts = {};
  publications.forEach(pub => { counts[pub] = 0; });

  const queryResults = [];

  rows.forEach(row => {
    // slice(1,-1) strips the leading/trailing empty strings from outer pipes
    // without removing empty inner cells (e.g. an empty sources column)
    const cells = row.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 3) return;
    const [queryNum, queryText, answer, sourcesRaw = ''] = cells;
    const sourcesLower = sourcesRaw?.toLowerCase() || '';

    const cited = [];
    pubTerms.forEach(({ pub, terms }) => {
      if (terms.some(term => term && sourcesLower.includes(term))) {
        counts[pub]++;
        cited.push(pub);
      }
    });

    queryResults.push({
      queryNum: queryNum?.trim(),
      query: queryText?.trim(),
      answer: answer?.trim(),
      sources: sourcesRaw?.trim(),
      cited,
    });
  });

  return { counts, queryResults };
}
