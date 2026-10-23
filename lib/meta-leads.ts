import { parseCsv } from "@/lib/csv";

const STORAGE_KEY = "core-meta-lead-sheet-v1";

export type MetaSheetConfig = {
  url: string;
  lastSyncedAt?: string;
  importedKeys: string[];
};

export function loadMetaSheetConfig(): MetaSheetConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.url !== "string") return null;
    return {
      url: parsed.url,
      lastSyncedAt: parsed.lastSyncedAt,
      importedKeys: Array.isArray(parsed.importedKeys) ? parsed.importedKeys : [],
    };
  } catch {
    return null;
  }
}

export function saveMetaSheetConfig(config: MetaSheetConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearMetaSheetConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// 일반 구글 시트 공유/편집 링크를 붙여넣어도 CSV 내보내기 링크로 바꿔준다.
// 이미 웹에 게시(pub?output=csv)된 링크라면 그대로 사용한다.
export function normalizeSheetCsvUrl(input: string): string {
  const url = input.trim();
  if (!url) return url;
  if (/output=csv|format=csv/i.test(url)) return url;

  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${gid}`;
  }
  return url;
}

export type ParsedMetaLead = {
  key: string;
  company: string;
  category: string;
  manager: string;
  email: string;
};

const HEADER_ALIASES = {
  id: ["id", "lead_id", "leadgen_id"],
  name: ["full_name", "name", "이름", "성함"],
  company: ["company_name", "company", "브랜드명", "회사명", "회사"],
  email: ["email", "이메일", "e-mail"],
  campaign: ["campaign_name", "ad_name", "adset_name", "캠페인", "광고"],
};

function findColumn(header: string[], aliases: string[]) {
  return header.findIndex((h) => aliases.includes(h.trim().toLowerCase()));
}

// 메타 잠재고객 광고가 내보내는 시트는 광고주마다 컬럼 구성이 조금씩
// 달라서, 자주 쓰이는 헤더 이름들을 폭넓게 매칭한다.
export function parseMetaLeadsCsv(text: string): ParsedMetaLead[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idIdx = findColumn(header, HEADER_ALIASES.id);
  const nameIdx = findColumn(header, HEADER_ALIASES.name);
  const companyIdx = findColumn(header, HEADER_ALIASES.company);
  const emailIdx = findColumn(header, HEADER_ALIASES.email);
  const campaignIdx = findColumn(header, HEADER_ALIASES.campaign);

  const get = (row: string[], idx: number) =>
    idx >= 0 ? (row[idx] ?? "").trim() : "";

  return rows
    .slice(1)
    .map((row) => {
      const id = get(row, idIdx);
      const name = get(row, nameIdx);
      const email = get(row, emailIdx);
      const campaign = get(row, campaignIdx);
      const company = get(row, companyIdx) || (name ? `${name} 리드` : "");
      const key = id || email || (name ? `${name}-${row.join("|")}` : "");
      return {
        key,
        company: company || "메타 리드",
        category: campaign ? `메타 리드 · ${campaign}` : "메타 리드",
        manager: name,
        email,
      };
    })
    .filter((r) => r.key);
}
