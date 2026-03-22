import { verifyToken, COOKIE } from "../../../lib/auth";
import { MODE2_SYSTEM_PROMPT, MODE2_USER_PROMPT, parseTableResponse } from "../../../lib/mode2prompt";

const PLATFORM_CONFIGS = {
  Claude: {
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
    url: "https://api.openai.com/v1/chat/completions",
    buildRequest: (userPrompt, systemPrompt, temperature) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    }),
    extractText: (data) => data.choices?.[0]?.message?.content || "",
  },
  Perplexity: {
    url: "https://api.perplexity.ai/chat/completions",
    buildRequest: (userPrompt, systemPrompt, temperature) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-large-128k-online",
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
      const text = data.choices?.[0]?.message?.content || "";
      const citations = data.citations || [];
      return citations.length ? `${text}\n\n[Native citations: ${citations.join(", ")}]` : text;
    },
  },
  Gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`,
    buildRequest: (userPrompt, systemPrompt, temperature) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature },
      }),
    }),
    extractText: (data) => data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "",
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
  const userPrompt = MODE2_USER_PROMPT(queries, personaQueryFraming);

  try {
    let url = config.url;
    if (config.urlSuffix) url += `?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(url, config.buildRequest(userPrompt, systemPrompt, temperature));
    const data = await response.json();
    const text = config.extractText(data);
    const { counts, queryResults } = parseTableResponse(text, publications);

    res.status(200).json({ text, counts, queryResults });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Allow larger payloads for batch queries
export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};
