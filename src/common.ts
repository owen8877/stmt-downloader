export interface Clickable {
  click(): void;
}

export async function getElement(
  selector: string | Iterable<string>,
  POLL_INTERVAL: number
): Promise<Element & Clickable> {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      let el;
      if (typeof selector === "string") {
        el = document.querySelector(selector);
      } else {
        el = Array.from(selector)
          .map((s) => document.querySelector(s))
          .find(Boolean);
      }
      if (el) {
        clearInterval(check);
        // @ts-ignore
        resolve(el);
      }
    }, POLL_INTERVAL);
  });
}

export async function getWindowProperty<T>(property: (window: Window) => T, POLL_INTERVAL: number): Promise<T> {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      const el: T = property(window.unsafeWindow);
      if (el) {
        clearInterval(check);
        resolve(el);
      }
    }, POLL_INTERVAL);
  });
}

export async function getByPoll<T>(property: () => T, POLL_INTERVAL: number): Promise<T> {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      const el: T = property();
      if (el) {
        clearInterval(check);
        resolve(el);
      }
    }, POLL_INTERVAL);
  });
}

export function formatDateMMsDDsYYYY(date: Date): string {
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
    .getDate()
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`;
}
export function formatDateYYYYdMMdDD(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

export function formatDateYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

export function getRelDateRange(today: Date, monthPushBack: number, endOnBusiness: boolean = false): [Date, Date] {
  let date = new Date(today);
  if (endOnBusiness) {
    // Move back to previous day if today is weekend
    if (date.getDay() === 0) {
      // Sunday
      date.setDate(date.getDate() - 2);
    } else if (date.getDay() === 6) {
      // Saturday
      date.setDate(date.getDate() - 1);
    } else {
      date.setDate(date.getDate() - 1);
      // If yesterday was weekend, move to Friday
      if (date.getDay() === 0) {
        // Sunday
        date.setDate(date.getDate() - 2);
      } else if (date.getDay() === 6) {
        // Saturday
        date.setDate(date.getDate() - 1);
      }
    }
  }

  let start: Date;
  start = new Date(date.getFullYear(), date.getMonth() - monthPushBack, 1);
  return [start, date];
}
export function getDateRange(today: Date, endOnBusiness: boolean = false): [Date, Date] {
  let date = new Date(today);
  if (endOnBusiness) {
    // Move back to previous day if today is weekend
    if (date.getDay() === 0) {
      // Sunday
      date.setDate(date.getDate() - 2);
    } else if (date.getDay() === 6) {
      // Saturday
      date.setDate(date.getDate() - 1);
    } else {
      date.setDate(date.getDate() - 1);
      // If yesterday was weekend, move to Friday
      if (date.getDay() === 0) {
        // Sunday
        date.setDate(date.getDate() - 2);
      } else if (date.getDay() === 6) {
        // Saturday
        date.setDate(date.getDate() - 1);
      }
    }
  }

  let start: Date;
  if (date.getMonth() >= 2) {
    start = new Date(date.getFullYear(), 0, 1);
  } else {
    start = new Date(date.getFullYear() - 1, 6, 1);
  }
  return [start, date];
}

interface Request {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "TRACE" | "OPTIONS" | "CONNECT";
  data?: string | FormData | undefined;
  headers?: { [header: string]: string } | undefined;
  overrideMimeType?: string | undefined;
  user?: string | undefined;
  password?: string | undefined;
  responseType?: XMLHttpRequestResponseType | undefined;
  synchronous?: boolean | undefined;
  timeout?: number | undefined;

  onabort?(response: Response): void;
  onerror?(response: Response): void;
  onload?(response: Response): void;
  onreadystatechange?(response: Response): void;
  ontimeout?(response: Response): void;
}

interface Response {
  readonly responseHeaders: string;
  readonly finalUrl: string;

  readonly readyState: 1 | 2 | 3 | 4;
  readonly response: any;
  readonly responseText: string;
  readonly responseXML: Document | false;
  readonly status: number;
  readonly statusText: string;
}

export function GM_xmlhttpRequest_promise(pack: Request) {
  return new Promise((resolve: (res: Response) => void, reject: (e: Error) => void) => {
    // @ts-ignore: https://violentmonkey.github.io/api/gm/#gm_xmlhttprequest
    GM_xmlhttpRequest({ ...pack, onload: resolve, onerror: reject });
  });
}

interface EasyRequestOptions {
  url: string;
  method: "GET" | "POST.url" | "POST.form" | "POST.json";
  payload?: URLSearchParams;
  headers?: { [header: string]: string };
}

export async function easyRequest({ url, method, payload, headers }: EasyRequestOptions): Promise<string> {
  function helper() {
    if (method === "GET") {
      const U = new URL(url);
      payload?.forEach((value, key) => U.searchParams.append(decodeURIComponent(key), decodeURIComponent(value)));
      return GM_xmlhttpRequest_promise({ method: "GET", url: U.toString(), headers });
    } else if (method === "POST.url") {
      return GM_xmlhttpRequest_promise({
        method: "POST",
        url,
        data: payload?.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
      });
    } else if (method === "POST.form") {
      const formData = new FormData();
      payload?.forEach((value, key) => formData.append(decodeURIComponent(key), decodeURIComponent(value)));
      return GM_xmlhttpRequest_promise({ method: "POST", url, data: formData, headers });
    } else if (method === "POST.json") {
      const _headers: Map<string, string> = new Map(Object.entries(headers || {}));
      if (!(_headers.get("Content-Type") || _headers.has("content-type"))) {
        _headers.set("Content-Type", "application/json");
      }
      return GM_xmlhttpRequest_promise({
        method: "POST",
        url,
        data: JSON.stringify(payload),
        headers: Object.fromEntries(_headers),
      });
    }
    throw new Error(`Unsupported method: ${method}`);
  }

  const { status, responseText } = await helper();
  if (status !== 200) {
    throw new Error(`Request failed: ${status} ${responseText}`);
  }
  return responseText;
}

interface EasyDownloadOptions {
  content: string;
  name: string;
  saveAs?: boolean;
}

export async function easyDownload({ content, name, saveAs = true }: EasyDownloadOptions): Promise<void> {
  let type;
  if (name.endsWith(".qfx")) type = "application/x-qfx";
  else if (name.endsWith(".csv")) type = "text/csv";
  else type = "application/octet-stream";
  await GM_download_promise({
    url: URL.createObjectURL(new Blob([content.trim()], { type })),
    name,
    saveAs,
  });
}

interface GM_download_options {
  url: string;
  name: string;
  saveAs: boolean;
}
export function GM_download_promise(option: GM_download_options) {
  const { url, name, saveAs } = option;
  return new Promise((resolve: (res: Response) => void, reject: (e: Error) => void) => {
    // @ts-ignore: https://violentmonkey.github.io/api/gm/#gm_download
    GM_download({ url, name, saveAs, onload: resolve, onerror: reject });
  });
}

export function easySetValue(key: string, value: any) {
  // https://violentmonkey.github.io/api/gm/#gm_setvalue
  //@ts-ignore
  GM_setValue(key, value);
}

export function easyGetValue(key: string): string {
  // https://violentmonkey.github.io/api/gm/#gm_getvalue
  //@ts-ignore
  return GM_getValue(key);
}
