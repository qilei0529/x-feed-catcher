import { getFeedItems, type FeedItem } from "./storage";

const searchEl = document.querySelector<HTMLInputElement>("#search");
const listNode = document.querySelector<HTMLUListElement>("#list");
const countNode = document.querySelector<HTMLParagraphElement>("#count");

if (!searchEl || !listNode || !countNode) {
  throw new Error("Popup markup is missing required elements");
}

const searchInput = searchEl;
const listEl = listNode;
const countEl = countNode;

let items: FeedItem[] = [];

function matches(item: FeedItem, query: string): boolean {
  if (!query) {
    return true;
  }
  const haystack = `${item.text} ${item.author} ${item.id}`.toLowerCase();
  return haystack.includes(query);
}

function formatTime(seenAt: number): string {
  return new Date(seenAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function render(): void {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = items.filter((item) => matches(item, query));

  countEl.textContent = `${filtered.length} / ${items.length}`;
  listEl.replaceChildren();

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = items.length
      ? "No matching tweets"
      : "No tweets saved yet. Open X and scroll your timeline.";
    listEl.append(empty);
    return;
  }

  for (const item of filtered) {
    const li = document.createElement("li");
    li.className = "item";

    const meta = document.createElement("div");
    meta.className = "meta";
    const author = document.createElement("span");
    author.textContent = item.author ? `@${item.author}` : "unknown";
    const time = document.createElement("span");
    time.textContent = formatTime(item.seenAt);
    meta.append(author, time);

    const text = document.createElement("p");
    text.className = "text";
    text.textContent = item.text || "(no text)";

    const actions = document.createElement("div");
    actions.className = "actions";

    const open = document.createElement("a");
    open.className = "button";
    open.href = item.url;
    open.textContent = "Open";
    open.addEventListener("click", (event) => {
      event.preventDefault();
      void chrome.tabs.create({ url: item.url });
    });

    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      const payload = item.text || item.url;
      await navigator.clipboard.writeText(payload);
      copy.textContent = "Copied";
      window.setTimeout(() => {
        copy.textContent = "Copy";
      }, 1200);
    });

    actions.append(open, copy);
    li.append(meta, text, actions);
    listEl.append(li);
  }
}

searchInput.addEventListener("input", render);

getFeedItems().then((saved) => {
  items = saved;
  render();
});
