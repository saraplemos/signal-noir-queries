import { verifyToken, COOKIE } from "../../../lib/auth";
import { MODE2_SYSTEM_PROMPT, MODE2_USER_PROMPT, parseTableResponse } from "../../../lib/mode2prompt";

const PLATFORM_CONFIGS = {
  Claude: {
    // No web_search tool: when passed, Claude returns tool_use content blocks
    // for each of 30 queries which breaks batch text extraction. Claude's
    // training data is comprehensive for publication citation research.
    url: "https://api.anthropic.com/v1/messages",
    buildRequest: (userPrompt, systemPrompt, temperature) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    }),
    extractText: (data) => data.content?.map(b => b.text || "").join("") || "",
  },
  ChatGPT: {
    // gpt-4o-search-preview: OpenAI model with built-in live web search.
    // temperature not supported on search models — omitted.
    url: "https://api.openai.com/v1/chat/completions",
    buildRequest: (userPrompt, systemPrompt) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }),
    extractText: (data) => data.choices?.[0]?.message?.content || "",
  },
  Perplexity: {
    // sonar: Perplexity's live search model — web search on by default.
    // return_citations: true adds native citation URLs to the response.
    url: "https://api.perplexity.ai/chat/completions",
    buildRequest: (userPrompt, systemPrompt, temperature) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        max_tokens: 4096,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        return_citations: true,
      }),
    }),
    extractText: (data) => {
      if (data.error) throw new Error(`Perplexity error: ${JSON.stringify(data.error)}`);
      const text = data.choices?.[0]?.message?.content || "";
      const citations = data.citations || [];
      return citations.length ? `${text}\n\n[Native citations: ${citations.join(", ")}]` : text;
    },
  },
  Gemini: {
    // google_search grounding: enables real-time Google Search results.
    // Gemini fetches live search results and grounds its response in them.
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    buildRequest: (userPrompt, systemPrompt, temperature) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 4096, temperature },
      }),
    }),
    extractText: (data) => {
      if (data.error) throw new Error(`Gemini error: ${JSON.stringify(data.error)}`);
      return data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    },
    urlSuffix: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const { platform, queries, publications, personaPrompt, personaTemperature, personaQueryFraming } = req.body;
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return res.status(400).json({ error: "Unknown platform" });

  const systemPrompt = personaPrompt || MODE2_SYSTEM_PROMPT;
  const temperature = personaTemperature ?? 0.7;
  const userPrompt = MODE2_USER_PROMPT(queries, personaQueryFraming, publications);

  try {
    let url = config.url;
    if (config.urlSuffix) url += `?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, config.buildRequest(userPrompt, systemPrompt, temperature));
    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || data?.error || JSON.stringify(data);
      return res.status(200).json({ error: `${platform} API error (${response.status}): ${msg}`, counts: {}, queryResults: [] });
    }

    const text = config.extractText(data);

    if (!text) {
      console.error(`${platform} returned empty text. Raw:`, JSON.stringify(data).slice(0, 800));
      return res.status(200).json({ error: `${platform} returned an empty response`, rawData: JSON.stringify(data).slice(0, 800), counts: {}, queryResults: [] });
    }

    const { counts, queryResults } = parseTableResponse(text, publications);
    res.status(200).json({ text, counts, queryResults });
  } catch (e) {
    console.error(`${platform} exception:`, e.message);
    res.status(200).json({ error: e.message, counts: {}, queryResults: [] });
  }
}

// Allow larger payloads for batch queries
// maxDuration is set via vercel.json — not supported in Pages Router config export
export const config = {
  api: { bodyParser: { sizeLimit: "2mb" }, responseLimit: false },
};
