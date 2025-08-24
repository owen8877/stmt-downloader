"use strict";
import {
  formatDateYYYYMMDD,
  getDateRange,
  getWindowProperty,
  getElement,
  easyRequest,
  easyDownload,
  formatDateYYYYdMMdDD,
} from "../common";

// config
const BANK_ID = "venmo";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function addDownloadButton() {
  // find an a element with class starts with vLogoButton
  const logoButton = await getElement("a[class^='vLogoButton']", POLL_INTERVAL);
  const parent = logoButton.parentElement;
  if (!parent) return;

  const CLASS = "my-download-btn";
  if (parent.querySelector(`.${CLASS}`)) return;

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

  parent.insertBefore(btn, logoButton.nextSibling);

  btn.addEventListener("click", async () => {
    try {
      await fireDownloadProcess();
    } catch (err) {
      console.error(`[${BANK_ID} Downloader] Error:`, err);
    }
  });
}

export async function fireDownloadProcess() {
  const script = Array.from(document.querySelectorAll("script[src^='/_next/static/']")).find(
    (el) => el instanceof HTMLScriptElement && el.src.endsWith("_buildManifest.js")
  ) as HTMLScriptElement | undefined;
  const next_id = script ? script.src.split("/")[5] : null;

  const profileId = await getWindowProperty(
    //@ts-ignore
    (w) => w.__NEXT_DATA__?.props?.pageProps?.initialMobxState?.profileStore?.id,
    POLL_INTERVAL
  );
  console.log(`Profile ID: ${profileId}`);

  //@ts-ignore
  const [content, endDate] = await routine(profileId, next_id);
  await easyDownload({
    content,
    name: `${BANK_ID}_${profileId}_${endDate}_YTD.csv`,
    saveAs: true,
  });
}

async function routine(profileId: string, next_id: string): Promise<[string, string]> {
  const [startDate, endDate] = getDateRange(new Date());

  const eStr = formatDateYYYYMMDD(endDate);
  const payload = new URLSearchParams();
  const year = new Date(endDate).getFullYear();

  payload.append("csv", "true");
  payload.append("profileId", profileId);
  payload.append("accountType", "personal");
  payload.append(
    "referer",
    encodeURIComponent(
      `/statement?accountType=personal&month=${new Date(endDate).getMonth() + 1}&profileId=${profileId}&year=${year}`
    )
  );
  payload.append("startDate", formatDateYYYYdMMdDD(startDate));
  payload.append("endDate", formatDateYYYYdMMdDD(endDate));
  payload.append("catchAll", "api");
  payload.append("catchAll", "statement");
  payload.append("catchAll", "download");

  console.log(`Payload:`, payload.toString());

  const response = await easyRequest({
    url: `https://account.venmo.com/_next/data/${next_id}/api/statement/download.json`,
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
