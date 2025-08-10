"use strict";
import { addDownloadButton, fireDownloadProcess } from "./lib";

try {
  // Try immediately in case the element is already present
  addDownloadButton();

  // Also observe for dynamically loaded content
  const observer = new MutationObserver(addDownloadButton);
  observer.observe(document.body, { childList: true, subtree: true });
  // fireDownloadProcess();
} catch (err) {
  console.error("[WF Downloader] Error:", err);
}
