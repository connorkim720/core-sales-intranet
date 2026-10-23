import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CORERANK_REFERENCES_URL } from "@/lib/corerank-references";

// corerank-references는 Express + DB(Postgres/Blob) + 관리자 화면이 붙은 별도 앱이라
// 이 인트라넷으로 코드를 옮기지 않고 배포본을 그대로 임베드한다.
export default function ReferencesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="mt-1 text-sm text-muted-foreground">
          인플루언서 콘텐츠 레퍼런스 · 코어랭크 레퍼런스 허브
        </p>
        <Button variant="outline" asChild className="h-9 py-2">
          <a href={CORERANK_REFERENCES_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon className="size-3.5" /> 새 창으로 열기
          </a>
        </Button>
      </div>

      <div className="h-[calc(100svh-12rem)] min-h-[480px] overflow-hidden rounded-[min(var(--radius-4xl),24px)] bg-card shadow-xs ring-1 ring-foreground/5 dark:ring-foreground/10">
        <iframe
          src={CORERANK_REFERENCES_URL}
          title="코어랭크 레퍼런스"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
