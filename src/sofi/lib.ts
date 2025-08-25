"use strict";
import { formatDateYYYYMMDD, easyRequest, easyDownload, formatDateYYYYdMMdDD, getRelDateRange } from "../common";

// config
const BANK_ID = "sofi";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function addDownloadButton() {
  const CLASS = "my-download-btn";
  if (document.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download CSV";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 8px 8px;
            margin: 8px 4px 8px 4px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: fit-content;
        `;

  const nav = document.querySelector("nav");
  if (!nav) return;
  nav.insertBefore(btn, nav.lastChild);

  btn.addEventListener("click", async () => {
    try {
      await fireDownloadProcess();
    } catch (err) {
      console.error(`[${BANK_ID} Downloader] Error:`, err);
    }
  });
}

function getInArray(d: any, needs: string, to_be: any) {
  for (const item of d) {
    if (item[needs] === to_be) return item;
  }
  return null;
}

type ChainResult = { chain: string[]; id: string } | null;

const findAccountId = (obj: any, chain: string[] = []): ChainResult => {
  if (typeof obj !== "object" || obj === null) return null;

  for (const [key, value] of Object.entries(obj)) {
    if (key === "url" && typeof value === "string" && value.startsWith("/my/money/account/#/")) {
      console.log(chain, key, value);
    }
    const keys = [key];
    //@ts-ignore
    if (value && value.queryHash) keys.push(value.queryHash);
    //@ts-ignore
    const result = findAccountId(value, [...chain, keys]);
    if (result) return result;
  }
  return null;
};

export async function fireDownloadProcess() {
  // find src element with content starts with window.REACT_QUERY_STATE, then, take the JSON content from the assignment char to the semicolon char
  const script = Array.from(document.scripts).find((s) => s.textContent?.startsWith("window.REACT_QUERY_STATE"));
  if (!script) throw new Error("REACT_QUERY_STATE script not found");

  const json = script.textContent?.slice(script.textContent.indexOf("{"), script.textContent.lastIndexOf("}") + 1);
  if (!json) throw new Error("REACT_QUERY_STATE JSON not found");

  const data = JSON.parse(json);

  // findAccountId(data); // debug only

  const rows = getInArray(
    getInArray(
      getInArray(
        getInArray(data.queries, "queryHash", '["GET_HOME_ZONES"]').state.data.content,
        "type",
        "SURFACE_OVERLAY"
      ).data.zones,
      "type",
      "ZONE_GNG"
    ).data.sections,
    "type",
    "SECTION_LIST_EXPANDABLE"
  ).data.rows;

  const accounts = [];
  for (const row of rows) {
    for (const item of row.expanded?.data?.items || []) {
      const url = item.data.dynamicAction.data.url;
      const accountId = url.match(/\/(\d+)\/account-detail/);
      if (accountId) accounts.push(accountId[1]);
    }
  }

  for (const account_id of accounts) {
    console.log(`${LOGGER_prefix} Account id: ${account_id}`);

    const [content, endDate] = await routine(account_id);
    await easyDownload({
      content,
      name: `${BANK_ID}_${account_id}_${endDate}_YTD.csv`,
      saveAs: true,
    });
  }
}

async function routine(account_id: string): Promise<[string, string]> {
  const [startDate, endDate] = getRelDateRange(new Date(), 2);
  // const startDate = new Date(2025, 6, 20);

  const eStr = formatDateYYYYMMDD(endDate);
  const payload = new URLSearchParams();

  payload.append("startDate", formatDateYYYYdMMdDD(startDate));
  payload.append("endDate", formatDateYYYYdMMdDD(endDate));

  console.log(`Payload:`, payload.toString());

  const response = await easyRequest({
    url: `https://www.sofi.com/money-transactions-hist-service/api/public/v1/accounts/transactions/export/${account_id}`,
    method: "GET",
    payload,
    headers: {
      Referer: "https://www.sofi.com/my/money/account/more/export-transaction-history",
    },
  });

  return [response, eStr];
}
