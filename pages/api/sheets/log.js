import { verifyToken, COOKIE } from "../../../lib/auth";
import { appendRow } from "../../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = req.cookies[COOKIE];
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorised" });

  const {
    sessionId, property, destination, market,
    persona, category, query, platform,
    citationScore, sources, runType,
  } = req.body;

  try {
    await appendRow([
      new Date().toISOString(),
      payload.name,           // tester name from JWT
      sessionId,
      property,
      destination,
      market || "Global",
      persona,
      category,
      query,
      platform,
      citationScore ?? 0,
      sources || "",
      runType || "Primary",
    ]);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Sheets error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
