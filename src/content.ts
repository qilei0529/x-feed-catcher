import type { FeedItem } from "./storage";

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

function extractTweet(article: Element): FeedItem | null {
  if (article.querySelector('[data-testid="placementTracking"]')) {
    return null;
  }

  const timeLink = article.querySelector("time")?.closest("a");
  const href = timeLink?.getAttribute("href") ?? "";
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

  return { id, text, author, url, seenAt: Date.now() };
}

function saveTweet(item: FeedItem): void {
  if (seenIds.has(item.id)) {
    return;
  }
  seenIds.add(item.id);

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
  scan();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) {
          continue;
        }
        if (
          node.matches('article[data-testid="tweet"], article[data-testid="tweetDetail"]')
        ) {
          const item = extractTweet(node);
          if (item) {
            saveTweet(item);
          }
        } else {
          scan(node);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) {
  observe();
} else {
  document.addEventListener("DOMContentLoaded", observe, { once: true });
}
