import { getFeedItems, removeFeedItems, type FeedItem } from "./storage";
import { formatViews, viewLevel, type ViewLevel } from "./views";

type TimeRange = "today" | "yesterday" | "week" | "older";

const searchEl = document.querySelector<HTMLInputElement>("#search");
const listNode = document.querySelector<HTMLUListElement>("#list");
const countNode = document.querySelector<HTMLParagraphElement>("#count");
const timeFilters = document.querySelector<HTMLDivElement>(".time-filters");
const levelFilters = document.querySelector<HTMLDivElement>(".level-filters");
const trashEl = document.querySelector<HTMLButtonElement>("#trash");

if (!searchEl || !listNode || !countNode || !timeFilters || !levelFilters || !trashEl) {
  throw new Error("Popup markup is missing required elements");
}

const searchInput = searchEl;
const listEl = listNode;
const countEl = countNode;
const trashButton = trashEl;

let items: FeedItem[] = [];
let timeRange: TimeRange = "today";
const enabledLevels = new Set<ViewLevel>(["high", "mid", "low"]);

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addDays(timestamp: number, days: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function matchesTime(item: FeedItem, range: TimeRange): boolean {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = addDays(todayStart, -1);
  const weekStart = addDays(todayStart, -6);

  switch (range) {
    case "today":
      return item.seenAt >= todayStart;
    case "yesterday":
      return item.seenAt >= yesterdayStart && item.seenAt < todayStart;
    case "week":
      return item.seenAt >= weekStart && item.seenAt < yesterdayStart;
    case "older":
      return item.seenAt < weekStart;
  }
}

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

function svgEl(name: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

function linkIcon(): SVGSVGElement {
  const svg = svgEl("svg", {
    viewBox: "0 0 24 24",
    width: "16",
    height: "16",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  }) as SVGSVGElement;
  svg.append(
    svgEl("path", { d: "M5 11v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" }),
    svgEl("path", { d: "M12 4v8" }),
    svgEl("path", { d: "m8 8 4-4 4 4" }),
  );
  return svg;
}

function getFilteredItems(): FeedItem[] {
  const query = searchInput.value.trim().toLowerCase();
  return items.filter(
    (item) =>
      matches(item, query) &&
      matchesTime(item, timeRange) &&
      enabledLevels.has(viewLevel(item.views ?? 0)),
  );
}

function render(): void {
  const filtered = getFilteredItems();

  countEl.textContent = `${filtered.length} / ${items.length}`;
  trashButton.disabled = filtered.length === 0;
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
    li.className = `item item-${viewLevel(item.views ?? 0)}`;

    const meta = document.createElement("div");
    meta.className = "meta";
    const author = document.createElement("span");
    author.textContent = item.author ? `@${item.author}` : "unknown";
    const views = document.createElement("span");
    views.textContent = `${formatViews(item.views ?? 0)} views`;
    const time = document.createElement("span");
    time.textContent = formatTime(item.seenAt);
    meta.append(author, views, time);

    const text = document.createElement("p");
    text.className = "text";
    text.textContent = item.text || "(no text)";

    const actions = document.createElement("div");
    actions.className = "actions";

    const open = document.createElement("a");
    open.className = "icon-link";
    open.href = item.url;
    open.title = "Open";
    open.setAttribute("aria-label", "Open");
    open.append(linkIcon());
    open.addEventListener("click", (event) => {
      event.preventDefault();
      void chrome.tabs.create({ url: item.url });
    });

    actions.append(open);
    li.append(meta, text, actions);
    listEl.append(li);
  }
}

searchInput.addEventListener("input", render);

trashButton.addEventListener("click", async () => {
  const filtered = getFilteredItems();
  if (filtered.length === 0) {
    return;
  }
  if (!window.confirm(`删除当前列表中的 ${filtered.length} 条？`)) {
    return;
  }
  const ids = filtered.map((item) => item.id);
  await removeFeedItems(ids);
  items = await getFeedItems();
  render();
});

timeFilters.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.range) {
    return;
  }
  timeRange = target.dataset.range as TimeRange;
  for (const chip of timeFilters.querySelectorAll(".chip")) {
    chip.classList.toggle("is-active", chip === target);
  }
  render();
});

levelFilters.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement) || !target.dataset.level) {
    return;
  }
  const level = target.dataset.level as ViewLevel;
  if (enabledLevels.has(level)) {
    enabledLevels.delete(level);
  } else {
    enabledLevels.add(level);
  }
  target.classList.toggle("is-on", enabledLevels.has(level));
  target.setAttribute("aria-pressed", enabledLevels.has(level) ? "true" : "false");
  render();
});

getFeedItems().then((saved) => {
  items = saved;
  render();
});
