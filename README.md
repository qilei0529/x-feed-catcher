# Twitter Feed Catcher

Chrome extension that saves each tweet you see on X (id + text) so an accidental refresh does not wipe the list from memory. Recovery is the toolbar popup: search, open the original tweet, or copy the text.

This does not rebuild the X timeline. It only keeps a local history of items you already scrolled past.

## Develop

```sh
pnpm install
pnpm dev
```

## Load in Chrome

```sh
pnpm install
pnpm build
```

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder in this repo
5. Open [x.com](https://x.com) and scroll the timeline, then click the extension icon to search saved tweets

Up to 500 tweets are stored in `chrome.storage.local`, newest first, keyed by tweet id.
