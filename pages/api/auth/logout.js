import { COOKIE } from "../../../lib/auth";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  res.status(200).json({ ok: true });
}
