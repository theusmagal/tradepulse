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

/**
 * Build a signed GET request for Bybit v5.
 * IMPORTANT: query params must be sorted alphabetically before signing.
 */
function buildSignedGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  apiSecret: string
) {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";

  // Sort params alphabetically by key as required by Bybit
  const sortedEntries = Object.entries(params).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const search = new URLSearchParams(sortedEntries).toString();

  const preSign = timestamp + apiKey + recvWindow + search;

  const sign = crypto.createHmac("sha256", apiSecret).update(preSign).digest("hex");

  const url = `${BYBIT_REST_BASE}${path}?${search}`;
  const headers = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-SIGN": sign,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": recvWindow,
  };

  return { url, headers };
}

export async function testBybitKeys(
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  try {
    const now = Date.now();
    const from = now - 24 * 60 * 60 * 1000;

    const { url, headers } = buildSignedGet(
      "/v5/position/closed-pnl",
      {
        category: "linear", // USDT perp under Unified Trading
        endTime: String(now),
        limit: "1",
        startTime: String(from),
      },
      apiKey,
      apiSecret
    );

    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      console.error("Bybit test HTTP error:", res.status, await res.text());
      return false;
    }

    const json = (await res.json()) as BybitClosedPnlResponse;
    if (json.retCode !== 0) {
      console.error("Bybit test API error:", json.retCode, json.retMsg);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Bybit test exception:", err);
    return false;
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
      endTime: String(toMs),
      limit: "100",
      startTime: String(fromMs),
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
      const text = await res.text().catch(() => "");
      console.error("Bybit closed-pnl HTTP error:", res.status, text);
      throw new Error(`Bybit HTTP ${res.status}`);
    }

    const json = (await res.json()) as BybitClosedPnlResponse;
    if (json.retCode !== 0) {
      console.error("Bybit closed-pnl API error:", json.retCode, json.retMsg);
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

  return executions;
}
