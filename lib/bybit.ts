// lib/bybit.ts
import crypto from "node:crypto";

const BYBIT_REST_BASE =
  (process.env.BYBIT_REST_BASE_URL?.trim() || "https://api.bybit.com").replace(/\/+$/, "");

// be a bit generous to avoid 10002 errors
const BYBIT_RECV_WINDOW = "10000"; // 10 seconds

type BybitClosedPnlRow = {
  symbol: string;
  side: "Buy" | "Sell";
  qty: string;
  orderPrice: string;
  closedSize: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  closedPnl: string;
  openFee: string;
  closeFee: string;
  createdTime: string; // ms since epoch as string
};

type BybitClosedPnlResult = {
  category: string;
  list: BybitClosedPnlRow[];
  nextPageCursor?: string;
};

type BybitClosedPnlResponse = {
  retCode: number;
  retMsg: string;
  result?: BybitClosedPnlResult;
};

export type BybitTestResult =
  | { ok: true }
  | {
      ok: false;
      status?: number;
      retCode?: number;
      retMsg?: string;
      raw?: string;
      base?: string;
      url?: string;
    };

function buildSignedGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  apiSecret: string
) {
  // timestamp slightly behind local time to avoid "ahead of server"
  const timestamp = (Date.now() - 2000).toString();

  const search = new URLSearchParams(params).toString();
  const preSign = timestamp + apiKey + BYBIT_RECV_WINDOW + search;

  const sign = crypto.createHmac("sha256", apiSecret).update(preSign).digest("hex");

  const url = `${BYBIT_REST_BASE}${path}?${search}`;

  // NOTE: V5 often expects X-BAPI-SIGN-TYPE: "2"
  const headers: Record<string, string> = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-SIGN": sign,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": BYBIT_RECV_WINDOW,
    "X-BAPI-SIGN-TYPE": "2",
    "User-Agent": "tradepulse/1.0 (+vercel)",
    Accept: "application/json",
  };

  return { url, headers };
}

export async function testBybitKeys(apiKey: string, apiSecret: string): Promise<BybitTestResult> {
  const now = Date.now();
  const from = now - 24 * 60 * 60 * 1000;

  const { url, headers } = buildSignedGet(
    "/v5/position/closed-pnl",
    {
      category: "linear",
      startTime: String(from),
      endTime: String(now),
      limit: "1",
    },
    apiKey,
    apiSecret
  );

  try {
    const res = await fetch(url, { method: "GET", headers, cache: "no-store" });

    const raw = await res.text().catch(() => "");
    let json: BybitClosedPnlResponse | null = null;
    try {
      json = raw ? (JSON.parse(raw) as BybitClosedPnlResponse) : null;
    } catch {
      json = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        retMsg: `HTTP ${res.status}`,
        raw: raw.slice(0, 800),
        base: BYBIT_REST_BASE,
        url,
      };
    }

    if (!json) {
      return {
        ok: false,
        retMsg: "Non-JSON response",
        raw: raw.slice(0, 800),
        base: BYBIT_REST_BASE,
        url,
      };
    }

    if (json.retCode !== 0) {
      return {
        ok: false,
        retCode: json.retCode,
        retMsg: json.retMsg,
        raw: raw.slice(0, 800),
        base: BYBIT_REST_BASE,
        url,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      retMsg: err instanceof Error ? err.message : "fetch failed",
      base: BYBIT_REST_BASE,
      url,
    };
  }
}

export type BybitExecution = {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  fee: number;
  realizedPnl: number;
  execTime: Date;
};

export async function fetchBybitExecutionsFromClosedPnl(
  apiKey: string,
  apiSecret: string,
  fromMs: number,
  toMs: number
): Promise<BybitExecution[]> {
  const executions: BybitExecution[] = [];
  let cursor: string | undefined;

  do {
    const params: Record<string, string> = {
      category: "linear",
      startTime: String(fromMs),
      endTime: String(toMs),
      limit: "100",
    };
    if (cursor) params.cursor = cursor;

    const { url, headers } = buildSignedGet("/v5/position/closed-pnl", params, apiKey, apiSecret);

    const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(`Bybit HTTP ${res.status}: ${raw.slice(0, 200)}`);
    }

    const json = (await res.json()) as BybitClosedPnlResponse;
    if (json.retCode !== 0) {
      throw new Error(`Bybit error ${json.retCode}: ${json.retMsg}`);
    }

    const list = json.result?.list ?? [];
    for (const row of list) {
      const side: "BUY" | "SELL" = row.side === "Buy" ? "BUY" : "SELL";
      const qty = Number(row.closedSize || row.qty || 0);
      const price = Number(row.avgExitPrice || row.orderPrice || 0);
      const fee = Number(row.openFee || 0) + Number(row.closeFee || 0);
      const realizedPnl = Number(row.closedPnl || 0);
      const execTime = new Date(Number(row.createdTime));

      executions.push({ symbol: row.symbol, side, qty, price, fee, realizedPnl, execTime });
    }

    cursor = json.result?.nextPageCursor || undefined;
  } while (cursor);

  return executions;
}
