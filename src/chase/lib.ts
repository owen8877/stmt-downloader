"use strict";
import {
  formatDateMMsDDsYYYY,
  formatDateYYYYMMDD,
  getByPoll,
  getDateRange,
  getWindowProperty,
  getElement,
  GM_download_promise,
  GM_xmlhttpRequest_promise,
} from "../common";

// config
const DOWNLOAD_URL = "https://secure.chase.com";
const BANK_ID = "chase";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

async function downloadDDARoutine(url: string, payload: URLSearchParams, accountName: string, endDate: string) {
  const { status, responseText } = await GM_xmlhttpRequest_promise({
    method: "POST",
    url: "https://secure.chase.com/svc/rr/accounts/secure/v1/account/activity/download/dda/list",
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

async function downloadCardRoutine(url: string, payload: URLSearchParams, accountName: string, endDate: string) {
  const U = new URL(
    `https://secure.chase.com/svc/rr/accounts/secure/gateway/credit-card/transactions/inquiry-maintenance/digital-transaction-activity/v1/transaction-activities`
  );
  payload.forEach((value, key) => U.searchParams.append(decodeURIComponent(key), decodeURIComponent(value)));

  const { status, responseText } = await GM_xmlhttpRequest_promise({
    method: "GET",
    url: U.toString(),
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

export async function addDownloadButton() {
  const container = await getElement("#dynamic-layout-container", POLL_INTERVAL);
  const CLASS = "my-download-btn";
  if (container.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download Transactions";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 8px 12px;
            margin-bottom: 10px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

  btn.addEventListener("click", async () => {
    location.hash = "#/dashboard/accountDetails/downloadAccountTransactions/index";
    await fireDownloadProcess();
  });

  container.insertBefore(btn, container.firstChild);
}

export async function fireDownloadProcess() {
  const requirejs = await getWindowProperty(
    // @ts-ignore
    (window) => window.requirejs,
    POLL_INTERVAL
  );
  const sessionCache = await getByPoll(() => requirejs("blue-app/cache/sessionCache"), POLL_INTERVAL);
  const tokenList = await getByPoll(
    () => sessionCache.get("service-/svc/rl/accounts/secure/v1/csrf/token/list"),
    POLL_INTERVAL
  );
  const token = tokenList.response.csrfToken;
  console.log(`${LOGGER_prefix} CSRF Token:`, sessionCache);

  const { status, responseText } = await GM_xmlhttpRequest_promise({
    method: "POST",
    url: `${DOWNLOAD_URL}/svc/rr/accounts/secure/v1/account/activity/download/options/list`,
    headers: {
      // Referer: "https://secure.chase.com/web/auth/dashboard",
      // "x-jpmc-channel-id": "C30",
      "x-jpmc-csrf-token": "NONE",
      // Origin: "https://secure.chase.com",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
  });
  if (status !== 200) {
    console.error(`${LOGGER_prefix} Failed to fetch download options`, status, responseText);
    return;
  }

  for (const account of JSON.parse(responseText)["downloadAccountActivityOptions"]) {
    console.log(`${LOGGER_prefix} Processing account:`, account);
    const { accountId, summaryType, nickName, mask } = account;
    const [build, download] =
      summaryType == "DDA" ? [buildCheckingPayload, downloadDDARoutine] : [buildCardPayload, downloadCardRoutine];
    const [payload, endDate] = build(accountId, token);
    console.log(`${LOGGER_prefix} Payload:`, payload);
    console.log(`${LOGGER_prefix} End Date:`, endDate);

    await download(account.downloadUrl, payload, `${trimAccountName(nickName)}_${mask}`, endDate);
  }
}

function buildCheckingPayload(accountId: string, csrftoken: string): [URLSearchParams, string] {
  const params = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  params.append("dateHi", formatDateYYYYMMDD(endDate));
  params.append("dateLo", formatDateYYYYMMDD(startDate));
  params.append("statementPeriodId", "ALL");
  params.append("transactionType", "ALL");
  params.append("filterTranType", "ALL");
  params.append("downloadType", "QFX");
  params.append("accountId", accountId);
  params.append("csrftoken", csrftoken);
  params.append("submit", "Submit");
  return [params, formatDateYYYYMMDD(endDate)];
}

function buildCardPayload(accountId: string, csrftoken: string): [URLSearchParams, string] {
  const params = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  params.append("end-date", formatDateYYYYMMDD(endDate));
  params.append("start-date", formatDateYYYYMMDD(startDate));
  params.append("account-activity-download-type-code", "QFX");
  params.append("digital-account-identifier", accountId);
  params.append("csrftoken", csrftoken);
  params.append("submit", "Submit");
  return [params, formatDateMMsDDsYYYY(endDate)];
}

export function trimAccountName(name: string) {
  return name
    .trim()
    .replace(/[\s-.]+/g, "")
    .replace(/[\u2122\u00AE\u00A9]/g, ""); // Remove ™, ®, ©
}
