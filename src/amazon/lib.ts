"use strict";
import { getElement, easyDownload, easySetValue, easyGetValue } from "../common";
import { md5 } from "js-md5";

// config
const BANK_ID = "amazon";
const LOGGER_prefix = `[${BANK_ID} Downloader]`;
// hack console.log and error to always use prefix
const origLog = console.log;
const origError = console.error;
console.log = (...args) => origLog(LOGGER_prefix, ...args);
console.error = (...args) => origError(LOGGER_prefix, ...args);

const POLL_INTERVAL = 500; // ms

class SingleTransaction {
  constructor(
    public id: string,
    public hint: string,
    public date: Date,
    public amount: number,
    public url: string,
    public description: string
  ) {}
}

// id---hint -> single
const matchedTransactions: Record<string, SingleTransaction> = {};
const cachedCardTextAreas: Record<string, HTMLTextAreaElement> = {};
let shouldCollectMode = false;
const history_length = 3;

export async function addGotoTransactionButton() {
  const container = await getElement("#nav-al-your-account", POLL_INTERVAL);
  // console.log(container);

  const CLASS = "my-download-btn";
  if (container?.querySelector(`.${CLASS}`)) return;

  const btn = document.createElement("button");
  btn.textContent = "Download CSV";
  btn.className = CLASS;
  btn.style.cssText = `
            padding: 4px 4px;
            margin: 0px 0px 4px 0px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            width: fit-content;
        `;

  btn.addEventListener("click", async () => {
    window.location.href = "https://www.amazon.com/cpe/yourpayments/transactions";
  });

  container?.insertBefore(btn, container.firstChild);
}

async function collectTransactionData() {
  if (!shouldCollectMode) return;
  const form = document.querySelector("form.a-spacing-none");
  if (!form) return;

  // @ts-ignore
  const transactionElements: Element[] = form.querySelectorAll(".a-section.a-spacing-base");

  let currentDate: string | undefined = undefined;
  for (const transactionElement of transactionElements) {
    if (transactionElement.querySelector(".a-row") === null) {
      currentDate = transactionElement.querySelector("span")?.textContent;
      continue;
    }

    const hint_amount = Array.from(transactionElement.querySelectorAll(".a-column span")).map((el) => el.textContent);
    const url_element = transactionElement.querySelector(".a-column a");
    if (hint_amount.length < 2 || !hint_amount[0] || !hint_amount[1]) {
      console.error("Failed to extract hint and amount:", {
        hint_amount,
        url_element,
      });
      continue;
    }
    if (hint_amount.length == 4) {
      const [hint, amount, order_text, description] = hint_amount;
      //@ts-ignore
      let id = order_text.trim() || "";
      if (id.startsWith("Order #")) {
        id = id.slice("Order #".length).trim();
      }

      matchedTransactions[`${id}---${hint}`] = new SingleTransaction(
        id,
        hint,
        currentDate ? new Date(currentDate) : new Date("2000-01-01"),
        // take out $ from amount and take negative,
        -parseFloat(hint_amount[1].replace(/[$,]/g, "")) || 0,
        // @ts-ignore
        "",
        description || ""
      );
    } else {
      const [hint, amount, description] = hint_amount;
      if (!url_element) {
        console.error("Failed to extract URL element:", {
          hint_amount,
        });
        continue;
      }
      let id = url_element.textContent?.trim() || "";
      if (id.startsWith("Order #")) {
        id = id.slice("Order #".length).trim();
      }

      matchedTransactions[`${id}---${hint}`] = new SingleTransaction(
        id,
        hint,
        currentDate ? new Date(currentDate) : new Date("2000-01-01"),
        // take out $ from amount and take negative,
        -parseFloat(hint_amount[1].replace(/[$,]/g, "")) || 0,
        // @ts-ignore
        url_element.href || "",
        description || ""
      );
    }
  }

  if (checkForOldTransactions(history_length)) {
    console.log("Found old transactions, stopped");
    // console.log(JSON.stringify(matchedTransactions, null, 2));

    shouldCollectMode = false;
    attachCardTextAreas();
  } else {
    console.log("No old transactions found");
    pressNextButton();
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pressNextButton() {
  // find an input element with a sibling span of text "Next Page"
  const nextButton = Array.from(document.querySelectorAll("input[type='submit']")).find((input) => {
    const span = input.nextElementSibling;
    return span && span.textContent === "Next Page";
  });

  if (nextButton) {
    await sleep(1000);
    //@ts-ignore
    nextButton.click();
    await sleep(1000);
    collectTransactionData();
  }
}

function checkForOldTransactions(ago: number) {
  const oldDate = new Date();
  oldDate.setMonth(oldDate.getMonth() - ago);
  for (const [_, t] of Object.entries(matchedTransactions)) {
    if (t.date < oldDate) {
      return true;
    }
  }
  return false;
}

function generateQFX(
  cardnumber: string,
  matchedTransactions: Record<string, SingleTransaction>,
  mapping: Record<string, string>
) {
  const earliest = Object.values(matchedTransactions).reduce((min, t) => (t.date < min ? t.date : min), new Date());
  const latest = Object.values(matchedTransactions).reduce((max, t) => (t.date > max ? t.date : max), new Date(0));

  const transactionCount: Record<string, number> = {};
  for (const [_, t] of Object.entries(matchedTransactions)) {
    transactionCount[t.id] = (transactionCount[t.id] || 0) + 1;
  }

  const formatQFXDate = (date: Date) => {
    // Format as YYYYMMDD120000
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}120000`;
  };
  const qfxHeader = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0
        <SEVERITY>INFO
      </STATUS>
      <DTSERVER>20250420120000[0:GMT]
      <LANGUAGE>ENG
      <FI>
        <ORG>B1
        <FID>10898
      </FI>
      <INTU.BID>10898
    </SONRS>
  </SIGNONMSGSRSV1>
  <CREDITCARDMSGSRSV1>
  <CCSTMTTRNRS>
  <TRNUID>1
  <STATUS>
    <CODE>0
    <SEVERITY>INFO
    <MESSAGE>Success
  </STATUS>
  <CCSTMTRS>
  <CURDEF>USD
  <CCACCTFROM>
    <ACCTID>${cardnumber}
  </CCACCTFROM>
  <BANKTRANLIST>
    <DTSTART>${formatQFXDate(earliest)}[0:GMT]
    <DTEND>${formatQFXDate(latest)}[0:GMT]
    `;

  const qfxTransactions = Object.values(matchedTransactions).map((t) => {
    if (cardnumber != mapping[t.hint]) return "";
    const hash = md5(t.id).substring(0, 6);
    return `
        <STMTTRN>
          <TRNTYPE>DEBIT
          <DTPOSTED>${formatQFXDate(t.date)}[0:GMT]
          <TRNAMT>${t.amount}
          <FITID>${formatQFXDate(t.date)}${hash}
          <NAME>${t.description}
          <MEMO>${(transactionCount[t.id] ?? 0) > 1 ? "mixed" : ""}
        </STMTTRN>
    `;
  });

  const qfxFooter = `
          </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>0
          <DTASOF>${formatQFXDate(latest)}[0:GMT]
        </LEDGERBAL>
        <AVAILBAL>
          <BALAMT>0
          <DTASOF>${formatQFXDate(latest)}[0:GMT]
        </AVAILBAL>
      </CCSTMTRS>
    </CCSTMTTRNRS>
  </CREDITCARDMSGSRSV1>
</OFX>
`;

  return qfxHeader + qfxTransactions.join("\n") + qfxFooter;
}

async function attachCardTextAreas() {
  const cardListArea = await getElement("#my-card-list-area", POLL_INTERVAL);
  if (cardListArea) {
    cardListArea.innerHTML = "";
  }

  //create dynamic textareas depending on unique hint elements in matchedTransactions
  for (const [_, t] of Object.entries(matchedTransactions)) {
    if (!cachedCardTextAreas[t.hint]) {
      const cardTextArea = document.createElement("textarea");
      cardTextArea.textContent = easyGetValue(`amazon-card-details-${t.hint}`) || "";
      cardTextArea.className = "my-card-text-area";
      cardTextArea.placeholder = `Enter card details to ${t.hint} here...`;

      cardTextArea.onchange = (e) => {
        const value = (e.target as HTMLTextAreaElement).value;
        easySetValue(`amazon-card-details-${t.hint}`, value);
      };
      cachedCardTextAreas[t.hint] = cardTextArea;
    }
  }
  for (const [_, t] of Object.entries(matchedTransactions)) {
    const cardTextArea = cachedCardTextAreas[t.hint];

    if (cardTextArea) {
      cardListArea?.appendChild(cardTextArea);
    }
  }
  //add a download button
  const downloadButton = document.createElement("button");
  downloadButton.textContent = "Download QFX";
  downloadButton.onclick = async () => {
    const mapping: Record<string, string> = {};
    for (const [_, t] of Object.entries(matchedTransactions)) {
      const cardTextArea = cachedCardTextAreas[t.hint];
      if (cardTextArea) {
        mapping[t.hint] = cardTextArea.value;
      }
    }

    // Remove duplicate card numbers
    const uniqueCardNumbers = Array.from(new Set(Object.values(mapping).filter(Boolean)));
    for (const cardnumber of uniqueCardNumbers) {
      const qfx_content = generateQFX(cardnumber, matchedTransactions, mapping);
      function strip(s: string) {
        return s
          .replace(/[^\w\s]/gi, "")
          .replace(/\s+/g, "_")
          .replace("*", "")
          .replace(" ", "");
      }
      await easyDownload({
        content: qfx_content,
        name: `${BANK_ID}_${strip(cardnumber)}_${new Date().toISOString().slice(0, 10)}_${history_length}mo.qfx`,
        saveAs: true,
      });
    }
    const widgetArea = await getElement(".my-widget-area", POLL_INTERVAL);
    widgetArea.appendChild(downloadButton);
  };
  cardListArea?.appendChild(downloadButton);
}

export async function addWidget() {
  const container = await getElement(".amazonPayWalletBreadcrumbsContainer ", POLL_INTERVAL);
  if (!container) return;

  const widgetArea = document.createElement("div");
  widgetArea.className = "my-widget-area a-container payWalletContentContainer";
  widgetArea.style.border = "1px solid #333";
  container?.parentNode?.insertBefore(widgetArea, container.nextSibling);

  const title = document.createElement("h3");
  title.textContent = "QFX Download Plugin";
  widgetArea.appendChild(title);

  const collectButton = document.createElement("button");
  collectButton.textContent = "Collect Transactions";
  collectButton.onclick = () => {
    shouldCollectMode = true;
    collectButton.style.display = "none";
    collectTransactionData();
  };
  widgetArea.appendChild(collectButton);

  const cardArea = document.createElement("div");
  const cardLabel = document.createElement("label");
  cardLabel.textContent = "Card Details";
  cardArea.id = "my-card-list-area";
  widgetArea.appendChild(cardLabel);

  widgetArea.appendChild(cardArea);
}
