export const MODE2_SYSTEM_PROMPT = `You are a luxury travel expert. Answer each query as you would for a real high-net-worth traveller seeking genuine recommendations. Be specific, authoritative, and draw on real editorial sources.`;

export const MODE2_USER_PROMPT = (queries, queryFraming) => `${queryFraming ? `${queryFraming}\n\n` : ""}Answer each luxury travel query below as you would for a real traveler. After each answer, list the specific sources you referenced or would cite.

For each query:
1. Brief answer (2-3 sentences)
2. Sources cited (be specific with publication/website names)

Return ONLY as a markdown table with these exact columns:
| Query # | Query | Brief Answer (2–3 sentences) | Sources Cited (publication names, websites, etc.) |

Be specific with source names. Include URLs if available. Ensure you include ALL sources used to make the recommendations. Do not add any text before or after the table.

Queries:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;

export function parseTableResponse(text, publications) {
  // Extract table rows
  const lines = text.split('\n').filter(l => l.trim().startsWith('|') && !l.includes('---'));
  const rows = lines.slice(1); // skip header row

  // Count citations per publication across all rows
  const counts = {};
  publications.forEach(pub => { counts[pub] = 0; });

  const queryResults = [];

  rows.forEach(row => {
    const cells = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 4) return;
    const [queryNum, queryText, answer, sourcesRaw] = cells;
    const sourcesLower = sourcesRaw?.toLowerCase() || '';

    const cited = [];
    publications.forEach(pub => {
      // Match publication name or common URL variants
      const pubLower = pub.toLowerCase();
      const urlVariant = pubLower.replace(/[^a-z0-9]/g, '').slice(0, 12);
      if (sourcesLower.includes(pubLower) || sourcesLower.includes(urlVariant)) {
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
