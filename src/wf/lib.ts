"use strict";
import {
  easyDownload,
  easyRequest,
  formatDateMMsDDsYYYY,
  getDateRange,
  getWindowProperty,
  trimAccountName,
} from "../common";

// config
const BANK_ID = "wf";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

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

    const [payload, endDate] = await routine(accountId);
    const content = await easyRequest({
      method: "POST.form",
      url: `https://connect.secure.wellsfargo.com/services${url}`,
      payload,
    });
    await easyDownload({
      content,
      name: `${BANK_ID}_${trimAccountName(accountName)}_${endDate}_YTD.qfx`,
      saveAs: true,
    });
    console.log(`${LOGGER_prefix} File download`);
  }
}

async function routine(accountId: string): Promise<[URLSearchParams, string]> {
  const payload = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  payload.append("accountId", accountId);
  payload.append("fromDate", formatDateMMsDDsYYYY(startDate));
  payload.append("toDate", formatDateMMsDDsYYYY(endDate));
  payload.append("fileFormat", "quicken");

  return [payload, formatDateMMsDDsYYYY(endDate)];
}
