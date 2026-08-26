export type FeedItem = {
  id: string;
  text: string;
  author: string;
  url: string;
  seenAt: number;
  views: number;
};

export const STORAGE_KEY = "feedItems";
export const MAX_ITEMS = 500;

export async function getFeedItems(): Promise<FeedItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const items = result[STORAGE_KEY];
  return Array.isArray(items) ? (items as FeedItem[]) : [];
}

export async function upsertFeedItem(item: FeedItem): Promise<void> {
  const items = await getFeedItems();
  const existingIndex = items.findIndex((entry) => entry.id === item.id);

  if (existingIndex >= 0) {
    const prev = items[existingIndex];
    items[existingIndex] = {
      ...prev,
      text: item.text || prev.text,
      author: item.author || prev.author,
      url: item.url || prev.url,
      views: Math.max(prev.views ?? 0, item.views ?? 0),
    };
  } else {
    items.unshift(item);
  }

  if (items.length > MAX_ITEMS) {
    items.length = MAX_ITEMS;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

export async function removeFeedItems(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  const idSet = new Set(ids);
  const items = (await getFeedItems()).filter((item) => !idSet.has(item.id));
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
}
