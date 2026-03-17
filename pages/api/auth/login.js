import { signToken, getUsers, COOKIE } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find(
    u => u.name.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = await signToken({ name: user.name });
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`);
  res.status(200).json({ name: user.name });
}
