"use strict";
import {
  formatDateMMsDDsYYYY,
  getDateRange,
  getWindowProperty as getWindowProperty,
  GM_download_promise,
  GM_xmlhttpRequest_promise,
} from "../common";

// config
const DOWNLOAD_URL = "https://connect.secure.wellsfargo.com/services";
const BANK_ID = "wf";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

async function downloadRoutine(url: string, payload: URLSearchParams, accountName: string, endDate: string) {
  const formData = new FormData();
  payload.forEach((value, key) => formData.append(decodeURIComponent(key), decodeURIComponent(value)));

  const { status, responseText } = await GM_xmlhttpRequest_promise({
    method: "POST",
    url: `${DOWNLOAD_URL}${url}`,
    data: formData,
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

export async function fireDownloadProcess() {
  const urls = await getWindowProperty(
    // @ts-ignore
    (window) => window._wfPayload?.applicationData?.downloadAccountActivity?.urls,
    POLL_INTERVAL
  );
  const accounts = await getWindowProperty(
    //@ts-ignore
    (window) => window._wfPayload?.applicationData?.downloadAccountActivity?.downloadAccountInfo?.allEligibleAccounts,
    POLL_INTERVAL
  );

  for (let i = 0; i < Math.min(urls.length, accounts.length); i++) {
    const urlObject = urls[i];
    const accountObject = accounts[i];
    console.log(`${LOGGER_prefix} Pair ${i}:`, { url: urlObject, account: accountObject });

    const url = urlObject["url"];
    const accountName = accountObject["displayName"];
    const accountId = accountObject["id"];

    const [payload, endDate] = buildPayload(accountId);
    await downloadRoutine(url, payload, trimAccountName(accountName), endDate);
  }
}

function buildPayload(accountId: string): [URLSearchParams, string] {
  const params = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  params.append("accountId", accountId);
  params.append("fromDate", formatDateMMsDDsYYYY(startDate));
  params.append("toDate", formatDateMMsDDsYYYY(endDate));
  params.append("fileFormat", "quicken");
  return [params, formatDateMMsDDsYYYY(endDate)];
}

export function trimAccountName(name: string) {
  return name
    .trim()
    .replace(/[\s-.]+/g, "")
    .replace(/[\u2122\u00AE\u00A9]/g, ""); // Remove ™, ®, ©
}
