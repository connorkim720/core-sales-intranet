import * as React from "react";
import {
  BotIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarIcon,
  ChartBarIcon,
  ClapperboardIcon,
  ClipboardListIcon,
  CompassIcon,
  FolderIcon,
  HeartHandshakeIcon,
  HomeIcon,
  InboxIcon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  MessagesSquareIcon,
  UserCogIcon,
  MegaphoneIcon,
  ReceiptTextIcon,
  SearchIcon,
  SproutIcon,
  UsersIcon,
  BookmarkIcon,
  FilmIcon,
  WalletIcon,
  PlusCircleIcon,
  ChartNoAxesCombinedIcon,
  LayoutGridIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: React.ReactElement;
  external?: boolean;
};

export type NavCategory = {
  id: string;
  label: string;
  icon: React.ReactElement;
  items: NavItem[];
};

// 대분류(아이콘 레일) → 소메뉴. 새 메뉴는 여기에만 추가하면
// 사이드바·메뉴 검색·⌘K 통합 검색에 모두 반영된다.
export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "home",
    label: "홈",
    icon: <HomeIcon />,
    items: [
      { title: "대시보드", url: "/", icon: <LayoutDashboardIcon /> },
      { title: "캘린더", url: "/calendar", icon: <CalendarIcon /> },
      { title: "주간 보고", url: "/weekly", icon: <ClipboardListIcon /> },
    ],
  },
  {
    id: "sales",
    label: "영업",
    icon: <BriefcaseIcon />,
    items: [
      { title: "딜 파이프라인", url: "/pipeline", icon: <KanbanSquareIcon /> },
      { title: "리드 인박스", url: "/leads", icon: <InboxIcon /> },
      { title: "고객사", url: "/customers", icon: <Building2Icon /> },
      { title: "계약·견적", url: "/quotes", icon: <ReceiptTextIcon /> },
      { title: "리포트", url: "/reports", icon: <ChartBarIcon /> },
      { title: "팀", url: "/team", icon: <UsersIcon /> },
    ],
  },
  {
    id: "creators",
    label: "크리에이터",
    icon: <UsersIcon />,
    items: [
      { title: "인플루언서 서치", url: "/influencers", icon: <SearchIcon /> },
      { title: "크리에이터 탐색", url: "/creator-search", icon: <CompassIcon /> },
      { title: "커뮤니티(IRM)", url: "/creator-irm", icon: <HeartHandshakeIcon /> },
      { title: "인플루언서 그룹", url: "/influencers/groups", icon: <FolderIcon /> },
    ],
  },
  {
    id: "campaign",
    label: "캠페인",
    icon: <ClapperboardIcon />,
    items: [
      { title: "캠페인 운영", url: "/campaigns", icon: <ClapperboardIcon /> },
      { title: "업무 보드", url: "/campaigns/tasks", icon: <KanbanSquareIcon /> },
    ],
  },
  {
    id: "settlement",
    label: "정산",
    icon: <WalletIcon />,
    items: [
      { title: "크리에이터 정산", url: "/creator-settlements", icon: <WalletIcon /> },
      { title: "정산 건 등록", url: "/creator-settlements/new", icon: <PlusCircleIcon /> },
    ],
  },
  {
    id: "front",
    label: "프론트",
    icon: <MegaphoneIcon />,
    items: [
      { title: "광고소재", url: "/ad-creatives", icon: <MegaphoneIcon /> },
      { title: "랜딩페이지", url: "/landing-pages", icon: <LayoutTemplateIcon /> },
      { title: "레퍼런스", url: "/references", icon: <BookmarkIcon /> },
      { title: "영상 레퍼런스", url: "/video-references", icon: <FilmIcon /> },
    ],
  },
  {
    id: "pms",
    label: "PMS",
    icon: <ChartNoAxesCombinedIcon />,
    items: [{ title: "콘텐츠 성과", url: "/pms", icon: <ChartNoAxesCombinedIcon /> }],
  },
  {
    id: "agents",
    label: "에이전트",
    icon: <BotIcon />,
    items: [
      { title: "에이전트 허브", url: "/agents", icon: <BotIcon /> },
      { title: "회의실", url: "/agents/room", icon: <MessagesSquareIcon /> },
      { title: "에이전트 관리", url: "/agents/roster", icon: <UserCogIcon /> },
    ],
  },
  {
    id: "work",
    label: "실무",
    icon: <SproutIcon />,
    items: [
      {
        title: "Core Insta Hub",
        url: "/insta-hub",
        icon: <LayoutGridIcon />,
      },
      {
        title: "시딩 실무 바로가기",
        url: "https://core-influencer-seeding.vercel.app/s/core-influencer-seeding",
        icon: <SproutIcon />,
        external: true,
      },
      {
        title: "바로 크리에이터",
        url: "https://heybaro-clone.vercel.app/creators",
        icon: <UsersIcon />,
        external: true,
      },
      {
        title: "바로 인플루언서 검색",
        url: "https://heybaro-clone.vercel.app/creators/influencers",
        icon: <SearchIcon />,
        external: true,
      },
    ],
  },
];

// 현재 경로가 속한 대분류 id. 가장 긴 url 접두사가 이긴다.
export function categoryOfPath(pathname: string): string {
  let best: { id: string; len: number } | null = null;
  for (const cat of NAV_CATEGORIES) {
    for (const item of cat.items) {
      if (item.external) continue;
      const match =
        item.url === "/" ? pathname === "/" : pathname === item.url || pathname.startsWith(`${item.url}/`);
      if (match && (!best || item.url.length > best.len)) {
        best = { id: cat.id, len: item.url.length };
      }
    }
  }
  return best?.id ?? "home";
}
