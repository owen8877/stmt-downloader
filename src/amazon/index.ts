"use strict";
import { addGotoTransactionButton, addWidget } from "./lib";

try {
  addGotoTransactionButton();
  addWidget();
} catch (err) {
  console.error("[Amazon Downloader] Error:", err);
}
