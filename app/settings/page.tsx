import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="mt-1 text-sm text-muted-foreground">
          세일즈팀 프로필과 쿼터 알림 설정
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium">프로필</CardTitle>
          <CardDescription>내 계정 정보를 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">이름</Label>
              <Input id="name" defaultValue="김세일" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" defaultValue="sales@heycore.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quota">이번 분기 개인 쿼터 (월 MRR 기준)</Label>
            <Input id="quota" defaultValue="10,000,000원" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-sm font-medium">알림</CardTitle>
          <CardDescription>
            딜 마감일·신규 리드 알림을 어떻게 받을지 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>· 마감 임박 딜 — 하루 전 이메일 알림</p>
          <p>· 신규 리드 배정 — 즉시 알림</p>
          <p>· 주간 팀 리포트 — 매주 월요일 오전 9시</p>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button>변경사항 저장</Button>
      </div>
    </div>
  );
}
