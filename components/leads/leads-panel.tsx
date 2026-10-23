"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircleIcon, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import { MetaSheetDialog } from "@/components/leads/meta-sheet-dialog";
import { REPS, SOURCE_LABEL } from "@/lib/mock-data";
import { useCustomerStore } from "@/lib/customer-store";
import { formatDate, formatDateTime, formatKRW } from "@/lib/format";
import {
  clearMetaSheetConfig,
  loadMetaSheetConfig,
  normalizeSheetCsvUrl,
  parseMetaLeadsCsv,
  saveMetaSheetConfig,
  type MetaSheetConfig,
} from "@/lib/meta-leads";

export function LeadsPanel() {
  const { customers, addCustomer } = useCustomerStore();
  const [sheetConfig, setSheetConfig] = React.useState<MetaSheetConfig | null>(
    null
  );
  const [syncing, setSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    // localStorage는 마운트 이후 클라이언트에서만 읽을 수 있다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSheetConfig(loadMetaSheetConfig());
  }, []);

  const leads = React.useMemo(
    () =>
      customers
        .filter((c) => c.stage === "lead")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [customers]
  );

  function handleSaveSheet(url: string) {
    const config: MetaSheetConfig = {
      url: normalizeSheetCsvUrl(url),
      importedKeys: [],
    };
    saveMetaSheetConfig(config);
    setSheetConfig(config);
    setSyncMessage(null);
  }

  function handleDisconnectSheet() {
    clearMetaSheetConfig();
    setSheetConfig(null);
    setSyncMessage(null);
  }

  async function handleSync() {
    if (!sheetConfig) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch(sheetConfig.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseMetaLeadsCsv(text);
      const importedKeys = new Set(sheetConfig.importedKeys);
      const newRows = rows.filter((r) => !importedKeys.has(r.key));

      for (const row of newRows) {
        addCustomer({
          company: row.company,
          category: row.category,
          manager: row.manager,
          email: row.email,
          source: "inbound",
          owner: REPS[0],
        });
        importedKeys.add(row.key);
      }

      const nextConfig: MetaSheetConfig = {
        ...sheetConfig,
        lastSyncedAt: new Date().toISOString(),
        importedKeys: Array.from(importedKeys),
      };
      saveMetaSheetConfig(nextConfig);
      setSheetConfig(nextConfig);
      setSyncMessage(
        newRows.length > 0
          ? `신규 리드 ${newRows.length}건을 가져왔습니다`
          : "새로 들어온 리드가 없습니다"
      );
    } catch {
      setSyncMessage(
        "동기화 실패 — 시트가 웹에 게시(공개)되어 있는지 확인해주세요"
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-1 text-sm text-muted-foreground">
            아직 상담이 시작되지 않은 신규 리드 · 총 {leads.length}건
          </p>
        </div>
        <div className="flex gap-2">
          <MetaSheetDialog
            currentUrl={sheetConfig?.url ?? null}
            onSave={handleSaveSheet}
            onDisconnect={handleDisconnectSheet}
          />
          <Button
            variant="outline"
            className="h-9 py-2"
            disabled={!sheetConfig || syncing}
            onClick={handleSync}
            title={
              sheetConfig
                ? "메타 잠재고객 시트에서 신규 리드 가져오기"
                : "먼저 메타 시트를 연동해주세요"
            }
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <AddCustomerDialog triggerLabel="리드 추가" />
        </div>
      </div>

      {sheetConfig && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            메타 잠재고객 시트 연동됨
          </span>
          {sheetConfig.lastSyncedAt && (
            <span>· 마지막 동기화 {formatDateTime(sheetConfig.lastSyncedAt)}</span>
          )}
          {syncMessage && (
            <span className="flex items-center gap-1 text-foreground">
              <AlertCircleIcon className="size-3" /> {syncMessage}
            </span>
          )}
        </div>
      )}

      <Card className="shadow-xs py-0">
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">등록된 리드가 없습니다</p>
            </div>
          ) : (
            <Table className="[&_:is(th,td)]:px-4">
              <TableHeader>
                <TableRow>
                  <TableHead>브랜드</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead className="text-center">유입경로</TableHead>
                  <TableHead className="text-center">담당 영업</TableHead>
                  <TableHead className="text-right">예상 MRR</TableHead>
                  <TableHead className="w-24 text-center">생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/customers?id=${c.id}`} className="hover:underline">
                        {c.company}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.category}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.manager}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{SOURCE_LABEL[c.source]}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {c.owner}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.dealValueMonthly ? formatKRW(c.dealValueMonthly) : "-"}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
