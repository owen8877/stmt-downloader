"use strict";
import { formatDateYYYYMMDD, getDateRange, getWindowProperty, getElement, easyRequest, easyDownload } from "../common";

// config
const BANK_ID = "fidelity";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

//@ts-ignore
const cachedRequest = [];

export async function hookGraphQL() {
  const unsafeWindow = await getWindowProperty((w) => w, POLL_INTERVAL);
  const origFetch = unsafeWindow.fetch;
  unsafeWindow.fetch = async (...args) => {
    const response = await origFetch(...args);

    // Clone the response so you can read it
    const cloned = response.clone();
    cloned.json().then((text) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("/ftgw/digital/webactivity/api/graphql") &&
        JSON.parse(args[1]?.body?.toString() || "{}").operationName === "getTransactions"
      ) {
        cachedRequest.length = 0;
        const { headers, body } = args[1] || {};
        //@ts-ignore
        if (!headers || headers["downloader"] === undefined) {
          cachedRequest.push([args[0], headers, body?.toString()]);
          console.log(`${LOGGER_prefix} Hooked graphql query:`, args, text);
        }
      }
    });

    return response;
  };
}

export async function addDownloadButton() {
  const container = (await getElement("#activity-order-search-bar-input", POLL_INTERVAL)).parentNode?.parentNode
    ?.parentNode;
  const CLASS = "my-download-btn";
  if (container?.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download CSV";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 4px 4px;
            margin: 0px 4px 0px 4px;
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

  container?.appendChild(btn);
}

export function generate_csv(data: string) {
  const header =
    "Run Date,Account,Account Number,Action,Symbol,Description,Type,Quantity,Price ($),Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date";

  // gather history.brokCsvData by history.acctNum
  const csvData: Record<string, string[]> = {};
  for (const history of JSON.parse(data).data.getTransactions.historys) {
    const acctNum = history.acctNum;
    if (!csvData[acctNum]) {
      csvData[acctNum] = [header];
    }
    csvData[acctNum].push(history.brokCsvData);
  }

  return csvData;
}

export async function fireDownloadProcess() {
  const [content, endDate] = await routine();

  const csv = generate_csv(content);
  for (const [account_id, rows] of Object.entries(csv)) {
    await easyDownload({
      content: rows.join("\n"),
      name: `${BANK_ID}_${account_id}_${endDate}_YTD.csv`,
      saveAs: true,
    });
  }
}

async function routine(): Promise<[string, string]> {
  const [startDate, endDate] = getDateRange(new Date(), true);

  const eStr = formatDateYYYYMMDD(endDate);

  const searchCriteriaDetail = {
    acctHistSort: "DATE",
    hasBasketName: true,
    histSortDir: "D",
    timePeriod: 90,
    txnCat: null,
    txnFromDate: Math.round(startDate.getTime() / 1000).toString(),
    txnToDate: Math.round(endDate.getTime() / 1000).toString(),
    viewType: "NON_CORE",
  };
  if (cachedRequest.length == 0) {
    console.error(`${LOGGER_prefix} No cached request found`);
    throw new Error("No cached request found");
  }
  //@ts-ignore
  const [url, headers, body] = cachedRequest[0];
  const payload = JSON.parse(body);
  payload["variables"]["searchCriteriaDetail"] = searchCriteriaDetail;

  const response = await easyRequest({
    url: url,
    method: "POST.json",
    //@ts-ignore
    payload,
    headers: { ...headers, downloader: "true" },
  });

  return [response, eStr];
}
