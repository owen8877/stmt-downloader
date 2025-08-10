"use strict";
import { fireDownloadProcess } from "./lib";

try {
  fireDownloadProcess();
} catch (err) {
  console.error("[WF Downloader] Error:", err);
}
