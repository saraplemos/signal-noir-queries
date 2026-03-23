import { verifyToken, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  );
  const data = await response.json();
  const models = (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
    .map(m => m.name);
  res.status(200).json({ models, raw: data.models?.map(m => ({ name: m.name, methods: m.supportedGenerationMethods })) });
}
