import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
const PUBLIC = ["/", "/api/auth/login"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname === p)) return NextResponse.next();

  const token = req.cookies.get("sn_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/", req.url));

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
