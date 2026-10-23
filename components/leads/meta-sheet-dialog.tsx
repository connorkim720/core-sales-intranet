"use client";

import * as React from "react";
import { Link2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MetaSheetDialog({
  currentUrl,
  onSave,
  onDisconnect,
}: {
  currentUrl: string | null;
  onSave: (url: string) => void;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState(currentUrl ?? "");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setUrl(currentUrl ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onSave(url.trim());
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 py-2">
          <Link2Icon className="size-3.5" />
          {currentUrl ? "연동 설정" : "메타 시트 연동"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>메타 잠재고객 시트 연동</DialogTitle>
            <DialogDescription>
              메타(Facebook·Instagram) 잠재고객 양식 광고가 리드를 내보내는
              구글 시트를 연결합니다. 시트에서 파일 → 공유 → 웹에 게시 → CSV로
              게시한 링크를 붙여넣으세요.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="sheet-url">게시된 CSV 링크</Label>
            <Input
              id="sheet-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              required
            />
            <p className="text-xs text-muted-foreground">
              일반 시트 공유 링크를 붙여넣어도 CSV 내보내기 링크로 자동 변환을
              시도합니다.
            </p>
          </div>
          <DialogFooter className="mt-4 sm:justify-between">
            {currentUrl ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onDisconnect();
                  setOpen(false);
                }}
              >
                연동 해제
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">저장</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
