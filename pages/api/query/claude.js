import { verifyToken, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const { query, personaPrompt } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: personaPrompt + "\n\nIMPORTANT: Always name specific hotels in your answer. At the end of your response, list all sources you drew on under a 'Sources:' heading.",
        messages: [{ role: "user", content: query }],
      }),
    });
    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";
    const sources = extractSources(text);
    res.status(200).json({ text, sources });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function extractSources(text) {
  const match = text.match(/sources?:?([\s\S]*?)$/i);
  if (!match) return "";
  return match[1].trim().slice(0, 500);
}
