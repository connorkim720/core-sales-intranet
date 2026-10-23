// 최소한의 RFC4180 스타일 CSV 파서 — 따옴표로 감싼 필드 안의 쉼표·줄바꿈을
// 올바르게 처리한다. 구글 시트 CSV 내보내기 결과를 파싱하는 용도로 충분하다.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      // \n에서 행을 끊으므로 무시
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) pushRow();

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => csvEscape(String(cell))).join(",")
  );
  // 앞에 BOM을 붙여야 엑셀에서 한글이 깨지지 않는다.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
