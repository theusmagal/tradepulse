import crypto from "node:crypto";

const BYBIT_REST_BASE =
  process.env.BYBIT_REST_BASE_URL ?? "https://api.bybit.com";

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
  createdTime: string;
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

function buildSignedGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  apiSecret: string
) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";

  const search = new URLSearchParams(params).toString();
  const preSign = timestamp + apiKey + recvWindow + search;

  const sign = crypto
    .createHmac("sha256", apiSecret)
    .update(preSign)
    .digest("hex");

  const url = `${BYBIT_REST_BASE}${path}?${search}`;
  const headers = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-SIGN": sign,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": recvWindow,
  };

  return { url, headers };
}

/**
 * Validate Bybit API keys.
 * Tries both "linear" (old) and "unified" (new unified trading) categories.
 */
export async function testBybitKeys(
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  const now = Date.now();
  const from = now - 24 * 60 * 60 * 1000;

  // Try both derivative categories; whichever succeeds is fine.
  for (const category of ["linear", "unified"]) {
    try {
      const { url, headers } = buildSignedGet(
        "/v5/position/closed-pnl",
        {
          category,
          startTime: String(from),
          endTime: String(now),
          limit: "1",
        },
        apiKey,
        apiSecret
      );

      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) continue;

      const json = (await res.json()) as BybitClosedPnlResponse;
      if (json.retCode === 0) {
        return true;
      }
    } catch {
      // ignore and try next category
    }
  }

  return false;
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

/**
 * Fetch executions derived from Closed PnL.
 * We pull from both "linear" and "unified" categories to support all setups.
 */
export async function fetchBybitExecutionsFromClosedPnl(
  apiKey: string,
  apiSecret: string,
  fromMs: number,
  toMs: number
): Promise<BybitExecution[]> {
  const executions: BybitExecution[] = [];

  // Fetch from both categories; for most users only one will return data.
  const categories: string[] = ["linear", "unified"];

  for (const category of categories) {
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = {
        category,
        startTime: String(fromMs),
        endTime: String(toMs),
        limit: "100",
      };
      if (cursor) params.cursor = cursor;

      const { url, headers } = buildSignedGet(
        "/v5/position/closed-pnl",
        params,
        apiKey,
        apiSecret
      );

      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        // if this category isn't valid for the account, just break out of it
        break;
      }

      const json = (await res.json()) as BybitClosedPnlResponse;
      if (json.retCode !== 0) {
        // If this category isn't supported, stop trying this one.
        break;
      }

      const list = json.result?.list ?? [];
      for (const row of list) {
        const side: "BUY" | "SELL" = row.side === "Buy" ? "BUY" : "SELL";

        const qty = Number(row.closedSize || row.qty || 0);
        const price = Number(row.avgExitPrice || row.orderPrice || 0);
        const fee = Number(row.openFee || 0) + Number(row.closeFee || 0);
        const realizedPnl = Number(row.closedPnl || 0);
        const execTime = new Date(Number(row.createdTime));

        executions.push({
          symbol: row.symbol,
          side,
          qty,
          price,
          fee,
          realizedPnl,
          execTime,
        });
      }

      cursor = json.result?.nextPageCursor || undefined;
    } while (cursor);
  }

  return executions;
}
