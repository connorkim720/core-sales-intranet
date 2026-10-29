import { NextResponse } from "next/server";

import {
  COOKIE_MAX_AGE_S,
  COOKIE_NAME,
  COOKIE_PATH,
  FAIL_LIMIT,
  clientIp,
  makeToken,
  recentFails,
  roomConfigured,
  sameSecret,
} from "@/lib/room-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 비밀번호를 한 번 맞추면 30일짜리 httpOnly 쿠키를 심는다(DELETE는 잠그기).
// 쿠키는 이 경로(/api/agent-room) 요청에만 실리고 SameSite=Strict라 다른 사이트의 요청에는 붙지 않는다.

const cookieBase = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: COOKIE_PATH,
};

export async function POST(req: Request) {
  if (!roomConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = Date.now();
  const ip = clientIp(req);
  if (recentFails(ip, now).length >= FAIL_LIMIT) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  let passcode = "";
  try {
    const raw = await req.text();
    if (raw.length > 1000) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const body = JSON.parse(raw) as { passcode?: unknown };
    passcode = typeof body.passcode === "string" ? body.passcode : "";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!sameSecret(passcode, process.env.ROOM_PASSCODE as string)) {
    recentFails(ip, now).push(now);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeToken(now), { ...cookieBase, maxAge: COOKIE_MAX_AGE_S });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...cookieBase, maxAge: 0 });
  return res;
}
