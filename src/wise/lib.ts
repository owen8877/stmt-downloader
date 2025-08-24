"use strict";
import {
  formatDateYYYYMMDD,
  getByPoll,
  getDateRange,
  getWindowProperty,
  getElement,
  easyRequest,
  easyDownload,
  easySetValue,
  easyGetValue,
} from "../common";

// config
const BANK_ID = "wise";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
const POLL_INTERVAL = 500; // ms

export async function hookOneTimeToken() {
  const unsafeWindow = await getWindowProperty((w) => w, POLL_INTERVAL);
  const origFetch = unsafeWindow.fetch;
  unsafeWindow.fetch = async (...args) => {
    const response = await origFetch(...args);

    // Clone the response so you can read it
    const cloned = response.clone();
    cloned.json().then((text) => {
      if (typeof args[0] === "string" && args[0].startsWith("/gateway/identity/api/v1/one-time-token/status")) {
        easySetValue("wise_one_time_token", text.oneTimeTokenProperties.oneTimeToken);
        console.log(`${LOGGER_prefix} Hooked one-time-token: ${text.oneTimeTokenProperties.oneTimeToken}`);

        // @ts-ignore
        const accessToken = args[1].headers["X-Access-Token"];
        if (accessToken) {
          easySetValue("wise_xaccess_token", accessToken);
          console.log(`${LOGGER_prefix} Hooked x-access-token: ${accessToken}`);
        }
      }
    });

    return response;
  };
}

export async function addDownloadButton() {
  const container = await getElement(".header-container", POLL_INTERVAL);
  const CLASS = "my-download-btn";
  if (container.querySelector(`.${CLASS}`)) return;

  const passwordInput = document.createElement("input");
  passwordInput.id = "random-input-password";
  passwordInput.type = "password";
  passwordInput.placeholder = "input password to";
  passwordInput.style.cssText = `
            padding: 4px 4px;
            margin: 0px 4px 0px 4px;
        `;
  container.appendChild(passwordInput);

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
  btn.disabled = true;

  btn.addEventListener("click", async () => {
    try {
      await fireDownloadProcess();
    } catch (err) {
      console.error(`[${BANK_ID} Downloader] Error:`, err);
    }
  });
  //add listener so that btn is active if only password is filled
  passwordInput.addEventListener("input", () => {
    btn.disabled = !passwordInput.value;
  });

  container.appendChild(btn);
}

async function verify(password: string) {
  const token: string = easyGetValue("wise_one_time_token");
  await easyRequest({
    url: "https://wise.com/gateway/identity/api/v1/one-time-token/status",
    method: "GET",
    headers: { "one-time-token": token },
  });
  await easyRequest({
    url: "https://wise.com/gateway/identity/api/v1/one-time-token/password/verify",
    method: "POST.json",
    payload: {
      //@ts-ignore
      password,
    },
    headers: { "one-time-token": token },
  });

  return token;
}

export async function fireDownloadProcess() {
  //@ts-ignore
  const password = (await getElement("#random-input-password", POLL_INTERVAL)).value;
  console.log(`Password: ${password}`);

  const account_id = await getWindowProperty(
    //@ts-ignore
    (w) => w?.__NEXT_DATA__?.props?.templateInitialProps?.selectedProfile?.id,
    POLL_INTERVAL
  );
  const account_type = await getWindowProperty(
    //@ts-ignore
    (w) => w?.__NEXT_DATA__?.props?.templateInitialProps?.selectedProfile?.type,
    POLL_INTERVAL
  );
  console.log(`Account ID: ${account_id}, Account Type: ${account_type}`);

  const token = await verify(password);
  const [content, endDate] = await routine(account_id, token);
  await easyDownload({
    content,
    name: `${BANK_ID}_${trimAccountName(account_type)}_${account_id}_${endDate}_YTD.csv`,
    saveAs: true,
  });
}

async function routine(account_id: string, token: string): Promise<[string, string]> {
  const [startDate, endDate] = getDateRange(new Date());

  const eStr = formatDateYYYYMMDD(endDate);
  const payload = {
    size: "10000",
    since: new Date(startDate).toISOString(),
    until: new Date(endDate).toISOString(),
  };

  const response = await easyRequest({
    url: `https://wise.com/gateway/v1/profiles/${account_id}/activities/list/export/`,
    method: "POST.json",
    //@ts-ignore
    payload,
    headers: {
      // "one-time-token": token,
      "x-2fa-approval": token,
      //@ts-ignore
      "x-access-token": easyGetValue("wise_xaccess_token"),
      "x-visual-context": "personal::light",
      Referer: "https://wise.com/all-transactions",
    },
  });

  return [response, eStr];
}

export function trimAccountName(name: string) {
  return name
    .trim()
    .replace(/[\s-.]+/g, "")
    .replace(/[\u2122\u00AE\u00A9]/g, ""); // Remove ™, ®, ©
}
