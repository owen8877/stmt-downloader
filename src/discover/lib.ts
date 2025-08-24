"use strict";
import {
  formatDateYYYYMMDD,
  getByPoll,
  getDateRange,
  getWindowProperty,
  getElement,
  easyRequest,
  easyDownload,
} from "../common";

// config
const BANK_ID = "discover";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function addDownloadButton() {
  const container = await getElement("#print-container", POLL_INTERVAL);
  const CLASS = "my-download-btn";
  if (container.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download CSV";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 4px 4px;
            margin: 12px 12px 0px 0px;
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
  const accountName = (await getElement(".account-name", POLL_INTERVAL)).textContent;
  const last_four = await getElement(".last-four-digits", POLL_INTERVAL);
  const lastFourDigits = (last_four.textContent || "").replace(/\D/g, "");
  console.log(`Account name: ${accountName}, Last four digits: ${lastFourDigits}`);

  const [content, endDate] = await routine();
  await easyDownload({
    content,
    name: `${BANK_ID}_${trimAccountName(accountName)}_${lastFourDigits}_${endDate}_12mo.csv`,
    saveAs: true,
  });
}

async function routine(): Promise<[string, string]> {
  const payload = new URLSearchParams();
  const [startDate, endDate] = getDateRange(new Date());

  const eStr = formatDateYYYYMMDD(endDate);
  // ?date=all&sortColumn=trans_date&grouping=-1&printView=false&sortOrder=Y&transaction=-1&printOption=transactions&way=actvt&includePend=Y&outputFormat=csv
  payload.append("date", "all");
  payload.append("sortColumn", "trans_date");
  payload.append("grouping", "-1");
  payload.append("printView", "false");
  payload.append("sortOrder", "Y");
  payload.append("transaction", "-1");
  payload.append("printOption", "transactions");
  payload.append("way", "actvt");
  payload.append("includePend", "Y");
  payload.append("outputFormat", "csv");

  const response = await easyRequest({
    url: "https://card.discover.com/cardmembersvcs/statements/app/stmt.download",
    method: "GET",
    payload,
    headers: {},
  });

  return [response, eStr];
}

export function trimAccountName(name: string) {
  return name
    .trim()
    .replace(/[\s-.]+/g, "")
    .replace(/[\u2122\u00AE\u00A9]/g, ""); // Remove ™, ®, ©
}
