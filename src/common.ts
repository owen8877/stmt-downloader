export interface Clickable {
  click(): void;
}

export async function getElement(selector: string, POLL_INTERVAL: number): Promise<Element & Clickable> {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      const el: Element | null = document.querySelector(selector);
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

export function formatDateYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, "0")}${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;
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
    console.log(date.getFullYear(), 0, 1);
    start = new Date(date.getFullYear(), 0, 1);
    console.log(start);
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
