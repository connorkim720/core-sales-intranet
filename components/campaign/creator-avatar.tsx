import type { Influencer } from "@/lib/influencer-data";

function hueOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// 프로필 이미지 데이터가 없어서 이름 앞 두 글자를 색 배경 위에 그린다.
export function CreatorAvatar({ creator, size = 40 }: { creator: Influencer; size?: number }) {
  const hue = hueOf(creator.id);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 50) % 360} 70% 48%))`,
      }}
    >
      {creator.handle.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function PlatformDot({ platform }: { platform: Influencer["platform"] }) {
  return platform === "instagram" ? (
    <span className="flex size-4 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-[7px] font-bold text-white">
      IG
    </span>
  ) : (
    <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[7px] font-bold text-background">
      TT
    </span>
  );
}
