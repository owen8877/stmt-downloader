"use strict";
import { getElement, easyRequest, easyDownload, formatDateYYYYdMMdDD, GM_xmlhttpRequest_promise } from "../common";

// config
const BANK_ID = "amex";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function addDownloadButton() {
  const container = await getElement(["div.DynamicLayout"], POLL_INTERVAL);
  const CLASS = "my-download-btn";
  if (container.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download QFX";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 8px 12px;
            margin: 0px 0px 12px 0px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: fit-content;
        `;

  btn.addEventListener("click", async () => {
    try {
      await fireDownloadProcess();
    } catch (err) {
      console.error(`[${BANK_ID} Downloader] Error:`, err);
    }
  });

  container.insertBefore(btn, container.firstChild);
}

export async function fireDownloadProcess() {
  const a = document.querySelector<HTMLAnchorElement>('a[title="Download your Statements"]');
  if (!a || !a.href) {
    console.error(`${LOGGER_prefix} Failed to find download link`);
    return;
  }
  const url = a.href;
  const match = url.match(/[?&]account_key=([^&]+)/);
  if (!match || match.length < 2 || !match[1]) {
    console.error(`${LOGGER_prefix} Failed to extract account_key`);
    return;
  }
  const accountKey = match[1];
  console.log(`${LOGGER_prefix} Extracted account_key:`, accountKey);

  // get all account list
  const [payload, endDate] = await buildPayload(accountKey);

  const U = new URL("https://global.americanexpress.com/api/servicing/v1/financials/documents");
  payload?.forEach((value, key) => U.searchParams.append(decodeURIComponent(key), decodeURIComponent(value)));
  const { status, responseText: content } = await GM_xmlhttpRequest_promise({
    method: "GET",
    url: U.toString() + "&=",
    headers: {},
  });

  if (status !== 200) {
    throw new Error(`Request failed: ${status} ${content}`);
  }

  const acctIdMatch = content.match(/<ACCTID>(.*?)<\/ACCTID>/);
  if (!acctIdMatch || acctIdMatch.length < 2 || !acctIdMatch[1]) {
    console.error(`${LOGGER_prefix} Failed to extract ACCTID`);
    return;
  }
  let acctId = acctIdMatch[1].replace(/[^a-zA-Z0-9]/g, "");
  console.log(`${LOGGER_prefix} Extracted ACCTID:`, acctId);

  await easyDownload({
    content,
    name: `${BANK_ID}_${acctId}_${endDate}_80.qfx`,
    saveAs: true,
  });
}

async function buildPayload(accountKey: string): Promise<[URLSearchParams, string]> {
  const payload = new URLSearchParams();
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 80);

  const eStr = formatDateYYYYdMMdDD(endDate);
  payload.append("end_date", eStr);
  payload.append("start_date", formatDateYYYYdMMdDD(startDate));
  payload.append("file_format", "quicken");
  payload.append("limit", "3000");
  payload.append("status", "posted");
  payload.append("account_key", accountKey);
  payload.append("client_id", "AmexAPI");

  return [payload, eStr];
}

export function trimAccountName(name: string) {
  return name
    .trim()
    .replace(/[\s-.]+/g, "")
    .replace(/[\u2122\u00AE\u00A9]/g, ""); // Remove ™, ®, ©
}
