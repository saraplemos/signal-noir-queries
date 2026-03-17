import { verifyToken, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const { query, personaPrompt } = req.body;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: personaPrompt + "\n\nIMPORTANT: Always name specific hotels in your answer. At the end of your response, list all sources you drew on under a 'Sources:' heading.",
          }],
        },
        contents: [{ role: "user", parts: [{ text: query }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
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
