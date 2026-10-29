export const PAGE_META: Record<string, string> = {
  "/": "대시보드",
  "/pipeline": "딜 파이프라인",
  "/leads": "리드 인박스",
  "/calendar": "캘린더",
  "/customers": "고객사",
  "/influencers": "인플루언서 서치",
  "/influencers/groups": "인플루언서 그룹",
  "/creator-search": "크리에이터 탐색",
  "/creator-irm": "커뮤니티(IRM)",
  "/team": "팀",
  "/quotes": "계약·견적",
  "/reports": "리포트",
  "/weekly": "주간 보고",
  "/ad-creatives": "광고소재",
  "/landing-pages": "랜딩페이지",
  "/references": "레퍼런스",
  "/video-references": "영상 레퍼런스",
  "/agents": "에이전트 허브",
  "/agents/room": "에이전트 회의실",
  "/agents/pepper": "페퍼 1:1 대화",
  "/agents/roster": "에이전트 관리",
  "/campaigns": "캠페인 운영",
  "/campaigns/tasks": "업무 보드",
  "/insta-hub": "Core Insta Hub",
  "/settings": "설정",
};

export function pageTitle(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  const match = Object.keys(PAGE_META)
    .filter((p) => p !== "/" && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_META[match] : "Core Sales";
}
