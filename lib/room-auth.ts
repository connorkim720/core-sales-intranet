import { createHmac, timingSafeEqual } from "node:crypto";

// 에이전트 AI 모드의 서버 쪽 인증 도우미(서버 전용).
// 비밀번호(ROOM_PASSCODE)를 한 번 맞추면 서명된 httpOnly 쿠키를 발급해서, 매번 입력하지 않아도 되게 한다.
// 쿠키 값은 만료시각 + HMAC(ROOM_PASSCODE) 이라 ROOM_PASSCODE를 바꾸면 기존 쿠키가 전부 무효가 된다.

export const COOKIE_NAME = "room_unlock";
export const COOKIE_PATH = "/api/agent-room"; // 이 경로의 요청에만 쿠키가 실린다
export const COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

const WINDOW_MS = 10 * 60_000;
export const FAIL_LIMIT = 10; // 10분당 비밀번호 실패(IP별)

// 서버리스 인스턴스 메모리 기준의 최선 노력(best-effort) 제한이다.
const fails = new Map<string, number[]>();

export function recentFails(ip: string, now: number) {
  const list = (fails.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(ip, list);
  return list;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function sameSecret(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const roomConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY && process.env.ROOM_PASSCODE);

const sign = (exp: string) => createHmac("sha256", process.env.ROOM_PASSCODE as string).update(`room-unlock-v1:${exp}`).digest("hex");

export function makeToken(now: number) {
  const exp = String(now + COOKIE_MAX_AGE_S * 1000);
  return `${exp}.${sign(exp)}`;
}

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}

export function hasValidUnlock(req: Request, now: number) {
  if (!process.env.ROOM_PASSCODE) return false;
  const [exp, mac] = cookieValue(req, COOKIE_NAME).split(".");
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) <= now) return false;
  return sameSecret(mac, sign(exp));
}
