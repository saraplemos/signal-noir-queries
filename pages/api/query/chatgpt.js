import { verifyToken, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const { query, personaPrompt } = req.body;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: personaPrompt + "\n\nIMPORTANT: Always name specific hotels in your answer. At the end of your response, list all sources you drew on under a 'Sources:' heading.",
          },
          { role: "user", content: query },
        ],
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
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
