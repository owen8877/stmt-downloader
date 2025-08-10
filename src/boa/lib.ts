"use strict";
import {
  formatDateMMsDDsYYYY,
  getDateRange,
  getElement,
  GM_download_promise,
  GM_xmlhttpRequest_promise,
  type Clickable,
} from "../common";

// config
const DOWNLOAD_URL = "https://secure.bankofamerica.com/ogateway/addapi/v1/download/form/transaction";
const BANK_ID = "boa";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function fireDownloadProcess(btn: Clickable) {
  btn.click();

  await getElement("#downloadTxnForm", POLL_INTERVAL);
  console.log(`${LOGGER_prefix} Form detected, starting download...`);

  // get account token and download qfx
  const token = getAccountToken();
  const [payload, endDate] = buildPayload(token);

  const accountName = getAccountName();
  const { status, responseText } = await GM_xmlhttpRequest_promise({
    method: "POST",
    url: DOWNLOAD_URL,
    data: payload.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (status !== 200) {
    console.error(`${LOGGER_prefix} Request failed`, status, responseText);
    return;
  }

  await GM_download_promise({
    url: URL.createObjectURL(new Blob([responseText.trim()], { type: "application/x-qfx" })),
    name: `${BANK_ID}_${accountName}_${endDate}_YTD.qfx`,
    saveAs: true,
  });
  console.log(`${LOGGER_prefix} File download`);
}

function getAccountToken() {
  const form = document.querySelector("#downloadTxnForm");
  if (!form) throw new Error("Form not found");
  const tokenInput = form.querySelector('input[name="payload.accountToken"]');
  if (!tokenInput) throw new Error("Account token input not found");
  // @ts-ignore
  return tokenInput.value;
}

function buildPayload(token: string): [URLSearchParams, string] {
  const params = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date(), true);
  params.append("payload.accountToken", token);
  params.append("payload.locale", "en-us");
  params.append("payload.txnSearchCriteria.txnPeriod", "custom range");
  params.append("payload.txnSearchCriteria.startDate", formatDateMMsDDsYYYY(startDate));
  params.append("payload.txnSearchCriteria.endDate", formatDateMMsDDsYYYY(endDate));
  params.append("payload.txnSearchCriteria.fileType", "qfx");
  return [params, formatDateMMsDDsYYYY(endDate)];
}

function getRawAccountName() {
  const el = document.querySelector("#account-displayname-label");
  if (!el) return "account";
  return el.textContent;
}

export function trimAccountName(name: string) {
  return name.trim().replace(/[\s-]+/g, "");
}

function getAccountName() {
  return trimAccountName(getRawAccountName());
}

export async function injectButton() {
  const btn = await getElement("#download-transactions", POLL_INTERVAL);
  const qfxBtn = document.createElement("button");
  qfxBtn.textContent = "QFX";
  qfxBtn.style.cssText =
    "padding:3px 8px;margin:0px 0px 0px 4px;background:#0066cc;color:#fff;border:none;border-radius:4px;cursor:pointer;";
  qfxBtn.addEventListener("click", () => {
    try {
      fireDownloadProcess(btn);
    } catch (err) {
      console.error(`${LOGGER_prefix} Error:`, err);
    }
  });
  btn.parentElement?.insertBefore(qfxBtn, btn.nextSibling);
}
