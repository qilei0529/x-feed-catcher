import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Twitter Feed Catcher",
  description:
    "Remember tweets you already saw so an accidental refresh does not lose them.",
  version: "0.1.0",
  permissions: ["storage"],
  host_permissions: ["https://x.com/*", "https://twitter.com/*"],
  action: {
    default_popup: "src/popup.html",
    default_title: "Twitter Feed Catcher",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://x.com/*", "https://twitter.com/*"],
      js: ["src/content.ts"],
      run_at: "document_idle",
    },
  ],
});
