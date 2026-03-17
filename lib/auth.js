import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
const COOKIE = "sn_session";

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export function getUsers() {
  const users = [];
  let i = 1;
  while (process.env[`USER_${i}_NAME`]) {
    users.push({
      name: process.env[`USER_${i}_NAME`],
      password: process.env[`USER_${i}_PASSWORD`],
    });
    i++;
  }
  return users;
}

export { COOKIE };
