import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 설치 파일(94MB)은 Vercel에 올리지 않고 별도 호스팅(GitHub 릴리스 등) 주소를 환경변수로 받는다.
const DOWNLOAD_URL = process.env.NEXT_PUBLIC_INSTA_HUB_DOWNLOAD_URL ?? "";

const USAGE = [
  "왼쪽 바의 계정 버튼을 누르면 해당 계정의 인스타 화면으로 전환됩니다.",
  "처음 한 번은 계정마다 직접 로그인하세요. 이후엔 로그인이 유지됩니다.",
  "더블클릭은 이름 변경, 우클릭은 계정 삭제(로그인 정보 포함), + 는 계정 추가입니다.",
  "하단의 1·2·4·6·9·10 버튼으로 한 화면에 동시에 볼 계정 수를 고릅니다.",
  "PC / 모바일 버튼으로 인스타를 모바일 화면으로 볼 수 있습니다.",
];

export default function InstaHubPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        인스타그램 계정 여러 개를 계정별 로그인 상태 그대로 한 창에서 전환하는 Windows 데스크톱 앱입니다.
        웹 화면 안에서는 돌릴 수 없어서, 각자 PC에 설치해 사용합니다.
      </p>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>설치</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {DOWNLOAD_URL ? (
            <Button asChild>
              <a href={DOWNLOAD_URL}>
                <DownloadIcon /> Core Insta Hub 설치 파일 다운로드 (Windows)
              </a>
            </Button>
          ) : (
            <Button disabled>
              <DownloadIcon /> 다운로드 링크 준비 중
            </Button>
          )}
          <p className="text-muted-foreground">
            서명이 없는 앱이라 처음 실행할 때 Windows SmartScreen 경고가 뜰 수 있습니다.
            &quot;추가 정보 → 실행&quot;을 누르세요. 로그인 정보는 PC별로 저장되므로 새 PC에서는 계정마다 다시 로그인해야 합니다.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>사용법</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            {USAGE.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        같은 PC·같은 IP에서 계정 여러 개를 쓰면 인스타그램이 보안 확인을 요구할 수 있습니다.
        동시에 여러 개를 열면 메모리를 많이 쓰니, PC 사양에 맞춰 분할 수를 고르세요.
      </p>
    </div>
  );
}
