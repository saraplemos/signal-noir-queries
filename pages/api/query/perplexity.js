import { verifyToken, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const { query, personaPrompt } = req.body;
  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: personaPrompt + "\n\nAlways name specific hotels in your answer.",
          },
          { role: "user", content: query },
        ],
        return_citations: true,
        return_images: false,
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    // Perplexity returns citations natively
    const citations = data.citations || [];
    const sources = citations.join(", ").slice(0, 1000);
    res.status(200).json({ text, sources });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
