import { verifyToken, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  const token = req.cookies[COOKIE];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid token" });
  res.status(200).json({ name: payload.name });
}
