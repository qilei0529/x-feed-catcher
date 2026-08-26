export const VIEW_TIER_HIGH = 10_000;
export const VIEW_TIER_MID = 1_000;

export type ViewLevel = "high" | "mid" | "low";

export function parseCompactCount(input: string): number | null {
  const match = input.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([KkMm万亿])?/);
  if (!match) {
    return null;
  }

  const n = Number(match[1]);
  if (!Number.isFinite(n)) {
    return null;
  }

  const unit = match[2] ?? "";
  if (unit === "k" || unit === "K") {
    return Math.round(n * 1_000);
  }
  if (unit === "m" || unit === "M") {
    return Math.round(n * 1_000_000);
  }
  if (unit === "万") {
    return Math.round(n * 10_000);
  }
  if (unit === "亿") {
    return Math.round(n * 100_000_000);
  }
  return Math.round(n);
}

export function parseViewsLabel(label: string): number | null {
  if (!/(view|views|浏览|查看)/i.test(label)) {
    return null;
  }
  return parseCompactCount(label);
}

export function viewLevel(views: number): ViewLevel {
  if (views > VIEW_TIER_HIGH) {
    return "high";
  }
  if (views > VIEW_TIER_MID) {
    return "mid";
  }
  return "low";
}

export function formatViews(views: number): string {
  if (views >= 10_000) {
    const wan = views / 10_000;
    const digits = views >= 100_000 ? 0 : 1;
    return `${wan.toFixed(digits).replace(/\.0$/, "")}万`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(views);
}
