"use strict";
import { injectButton } from "./lib";

try {
  injectButton();
} catch (err) {
  console.error("[BOA Downloader] Error:", err);
}
