"use strict";
import {
  formatDateYYYYMMDD,
  getByPoll,
  getDateRange,
  getWindowProperty,
  getElement,
  easyRequest,
  easyDownload,
  trimAccountName,
} from "../common";

// config
const BANK_ID = "chase";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function addDownloadButton() {
  const container = await getElement("#navigation", POLL_INTERVAL);
  const CLASS = "my-download-btn";
  if (container.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download QFX";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 8px 12px;
            margin: 12px 0px 0px 0px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: fit-content;
        `;

  btn.addEventListener("click", async () => {
    location.hash = "#/dashboard/accountDetails/downloadAccountTransactions/index";
    try {
      await fireDownloadProcess();
    } catch (err) {
      console.error(`[${BANK_ID} Downloader] Error:`, err);
    }
  });

  container.insertBefore(btn, container.firstChild);
}

export async function fireDownloadProcess() {
  // get csrf token
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

  // get all account list
  const response = await easyRequest({
    url: "https://secure.chase.com/svc/rr/accounts/secure/v1/account/activity/download/options/list",
    method: "POST.url",
    headers: {
      "x-jpmc-csrf-token": "NONE",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
  });

  for (const account of JSON.parse(response)["downloadAccountActivityOptions"]) {
    console.log(`${LOGGER_prefix} Processing account:`, account);
    const { accountId, summaryType, nickName, mask } = account;
    const routine = summaryType == "DDA" ? DDARoutine : CardRoutine;
    const [content, endDate] = await routine(accountId, token);
    await easyDownload({
      content,
      name: `${BANK_ID}_${trimAccountName(nickName)}_${mask}_${endDate}_YTD.qfx`,
      saveAs: true,
    });
  }
}

async function DDARoutine(accountId: string, csrftoken: string): Promise<[string, string]> {
  const payload = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  const eStr = formatDateYYYYMMDD(endDate);
  payload.append("dateHi", eStr);
  payload.append("dateLo", formatDateYYYYMMDD(startDate));
  payload.append("statementPeriodId", "ALL");
  payload.append("transactionType", "ALL");
  payload.append("filterTranType", "ALL");
  payload.append("downloadType", "QFX");
  payload.append("accountId", accountId);
  payload.append("csrftoken", csrftoken);
  payload.append("submit", "Submit");

  const response = await easyRequest({
    url: "https://secure.chase.com/svc/rr/accounts/secure/v1/account/activity/download/dda/list",
    method: "POST.url",
    payload,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return [response, eStr];
}

async function CardRoutine(accountId: string, csrftoken: string): Promise<[string, string]> {
  const payload = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  payload.append("end-date", formatDateYYYYMMDD(endDate));
  payload.append("start-date", formatDateYYYYMMDD(startDate));
  payload.append("account-activity-download-type-code", "QFX");
  payload.append("digital-account-identifier", accountId);
  payload.append("csrftoken", csrftoken);
  payload.append("submit", "Submit");

  const response = await easyRequest({
    url: "https://secure.chase.com/svc/rr/accounts/secure/gateway/credit-card/transactions/inquiry-maintenance/digital-transaction-activity/v1/transaction-activities",
    method: "GET",
    payload,
  });

  return [response, formatDateYYYYMMDD(endDate)];
}
