export type ContentMetrics = {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};

export function interactions(metrics: ContentMetrics) {
  return metrics.likes + metrics.comments + metrics.saves + metrics.shares;
}

// 업로드 콘텐츠의 조회수 기준 ER. 조회수가 없으면 비율을 계산하지 않습니다.
export function engagementRate(metrics: ContentMetrics): number | null {
  return metrics.views > 0 ? (interactions(metrics) / metrics.views) * 100 : null;
}
