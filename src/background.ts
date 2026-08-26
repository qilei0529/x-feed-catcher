import { upsertFeedItem, type FeedItem } from "./storage";

type UpsertMessage = {
  type: "UPSERT_FEED_ITEM";
  item: FeedItem;
};

let writeQueue: Promise<void> = Promise.resolve();

function enqueueUpsert(item: FeedItem): Promise<void> {
  writeQueue = writeQueue
    .then(() => upsertFeedItem(item))
    .catch((error) => {
      console.error("Failed to save feed item", error);
    });
  return writeQueue;
}

chrome.runtime.onMessage.addListener((message: UpsertMessage, _sender, sendResponse) => {
  if (message?.type !== "UPSERT_FEED_ITEM" || !message.item?.id) {
    return;
  }

  enqueueUpsert(message.item).then(() => {
    sendResponse({ ok: true });
  });
  return true;
});
