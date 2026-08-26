import type { FeedItem } from "./storage";
import { parseCompactCount, parseViewsLabel } from "./views";

const seenIds = new Set<string>();
const SKIP_HANDLES = new Set([
  "i",
  "home",
  "explore",
  "search",
  "settings",
  "compose",
  "notifications",
  "messages",
  "jobs",
  "communities",
]);

const SHOW_MORE_RE =
  /show\s+(\d+\s+)?posts?|see new posts|显示\s*\d+|条新(帖子|动态)|查看新帖子/i;

function extractStatusHref(article: Element): string {
  const timeHref = article.querySelector("time")?.closest("a")?.getAttribute("href") ?? "";
  if (/\/status\/\d+/.test(timeHref)) {
    return timeHref;
  }

  const links = article.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    const href = link.getAttribute("href") ?? "";
    if (href.includes("/analytics") || href.includes("/photo")) {
      continue;
    }
    if (/\/status\/\d+/.test(href)) {
      return href;
    }
  }

  return "";
}

function extractTweet(article: Element): FeedItem | null {
  if (article.querySelector('[data-testid="placementTracking"]')) {
    return null;
  }

  const href = extractStatusHref(article);
  const idMatch = href.match(/\/status\/(\d+)/);
  if (!idMatch) {
    return null;
  }

  const id = idMatch[1];
  const handleFromUrl = href.match(/^\/([^/?#]+)\/status\//)?.[1] ?? "";

  const text =
    article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() ?? "";

  let author = handleFromUrl;
  if (!author) {
    const userLinks = article.querySelectorAll('a[href^="/"]');
    for (const link of userLinks) {
      const path = (link.getAttribute("href") ?? "").split("?")[0];
      if (!path || path.includes("/status/")) {
        continue;
      }
      const handle = path.replace(/^\//, "").split("/")[0];
      if (handle && !SKIP_HANDLES.has(handle)) {
        author = handle;
        break;
      }
    }
  }

  const url = `https://x.com/${author || "i"}/status/${id}`;

  return { id, text, author, url, seenAt: Date.now(), views: extractViews(article) };
}

function extractViews(article: Element): number {
  const analytics = article.querySelector('a[href*="/analytics"]');
  const analyticsLabel = analytics?.getAttribute("aria-label") ?? "";
  const fromAnalytics = parseViewsLabel(analyticsLabel);
  if (fromAnalytics != null) {
    return fromAnalytics;
  }

  const labeled = article.querySelectorAll("[aria-label]");
  for (const el of labeled) {
    const fromLabel = parseViewsLabel(el.getAttribute("aria-label") ?? "");
    if (fromLabel != null) {
      return fromLabel;
    }
  }

  const analyticsText = analytics?.textContent ?? "";
  return parseCompactCount(analyticsText) ?? 0;
}

const lastSavedViews = new Map<string, number>();

function saveTweet(item: FeedItem): void {
  const prevViews = lastSavedViews.get(item.id);
  if (prevViews !== undefined && item.views <= prevViews && seenIds.has(item.id)) {
    return;
  }

  seenIds.add(item.id);
  lastSavedViews.set(item.id, item.views);

  chrome.runtime.sendMessage(
    { type: "UPSERT_FEED_ITEM", item },
    () => void chrome.runtime.lastError,
  );
}

function scan(root: ParentNode = document): void {
  const articles = root.querySelectorAll(
    'article[data-testid="tweet"], article[data-testid="tweetDetail"]',
  );
  for (const article of articles) {
    const item = extractTweet(article);
    if (item) {
      saveTweet(item);
    }
  }
}

function observe(): void {
  let debounceTimer = 0;
  const retryTimers: number[] = [];

  const scheduleScan = (immediateRetry = false) => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      scan();
      if (!immediateRetry) {
        return;
      }
      for (const timer of retryTimers) {
        window.clearTimeout(timer);
      }
      retryTimers.length = 0;
      retryTimers.push(window.setTimeout(scan, 800), window.setTimeout(scan, 2000));
    }, 400);
  };

  scan();

  const observer = new MutationObserver(() => {
    scheduleScan(true);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href", "aria-label", "datetime"],
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const clickable = target.closest("button, div[role='button'], a");
      const label = (clickable?.textContent ?? "").trim();
      if (!label || !SHOW_MORE_RE.test(label)) {
        return;
      }
      scheduleScan(true);
      window.setTimeout(scan, 1200);
      window.setTimeout(scan, 2500);
    },
    true,
  );
}

if (document.body) {
  observe();
} else {
  document.addEventListener("DOMContentLoaded", observe, { once: true });
}
