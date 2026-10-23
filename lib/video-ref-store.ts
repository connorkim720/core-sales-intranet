"use client";

import * as React from "react";

const STORAGE_KEY = "core-sales-video-refs-v1";

export type VideoRef = {
  id: string;
  title: string;
  brand: string;
  category: string;
  note: string;
  driveId: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  hook?: string;
  appeal?: string;
  tags?: string[];
  campaignIds?: string[];
  createdAt: string;
};

export type VideoRefInput = Omit<VideoRef, "id" | "createdAt">;

// 구글 드라이브 공유 링크에서 파일 ID를 뽑는다. 지원 형식:
//   https://drive.google.com/file/d/<ID>/view?usp=sharing
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?id=<ID>&export=download
//   https://docs.google.com/file/d/<ID>/edit
// 파일 ID만 붙여 넣어도 받는다. 폴더 링크는 영상 하나가 아니라서 거절한다.
export function parseDriveId(input: string): { id: string } | { error: string } {
  const text = input.trim();
  if (!text) return { error: "링크를 입력하세요" };

  if (/^[\w-]{20,}$/.test(text)) return { id: text };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { error: "올바른 링크가 아닙니다" };
  }
  if (!/(^|\.)(drive|docs)\.google\.com$/.test(url.hostname)) {
    return { error: "구글 드라이브 링크만 지원합니다" };
  }
  if (/\/folders\//.test(url.pathname) || /\/drive\/folders\//.test(url.pathname)) {
    return { error: "폴더 링크입니다. 영상 파일의 공유 링크를 붙여 넣으세요" };
  }
  const byPath = url.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([\w-]+)/);
  const id = byPath?.[1] ?? url.searchParams.get("id");
  return id && /^[\w-]{10,}$/.test(id) ? { id } : { error: "링크에서 파일 ID를 찾지 못했습니다" };
}

export const driveEmbedUrl = (driveId: string) => `https://drive.google.com/file/d/${driveId}/preview`;
export const driveViewUrl = (driveId: string) => `https://drive.google.com/file/d/${driveId}/view`;
export const driveThumbUrl = (driveId: string) => `https://drive.google.com/thumbnail?id=${driveId}&sz=w640`;

export function safeWebUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function videoRefUrl(item: VideoRef): string {
  return item.sourceUrl || (item.driveId ? driveViewUrl(item.driveId) : "");
}

export function videoPlatform(item: VideoRef): string {
  if (item.driveId) return "Drive";
  const url = safeWebUrl(item.sourceUrl ?? "");
  if (!url) return "영상";
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "instagram.com") return "Instagram";
  if (host === "tiktok.com") return "TikTok";
  if (host === "youtube.com" || host === "youtu.be") return "YouTube";
  return host;
}

// 추적 파라미터가 다른 동일 게시물을 PMS 결과 URL과 연결한다.
export function contentUrlKey(value: string): string | null {
  const href = safeWebUrl(value);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (host === "youtube.com" && path === "/watch") {
    return `${host}/watch?v=${url.searchParams.get("v") ?? ""}`;
  }
  return `${host}${path}`;
}

function load(): VideoRef[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VideoRef[]) : [];
  } catch {
    return [];
  }
}

export function useVideoRefs() {
  const [items, setItems] = React.useState<VideoRef[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(load());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // 저장 실패는 무시 — 데모 편의 기능
    }
  }, [items, hydrated]);

  const add = React.useCallback((input: VideoRefInput) => {
    const item: VideoRef = {
      ...input,
      id: `vref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [item, ...prev]);
  }, []);

  const update = React.useCallback((id: string, input: VideoRefInput) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...input } : x)));
  }, []);

  const patch = React.useCallback((id: string, input: Partial<VideoRefInput>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...input } : x)));
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { items, hydrated, add, update, patch, remove };
}
