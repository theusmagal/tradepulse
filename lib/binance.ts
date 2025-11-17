
import crypto from "crypto";

const BASE =
  process.env.BINANCE_DEFAULT_BASE_URL?.replace(/\/+$/, "") ??
  "https://fapi.binance.com";

const IS_FUTURES = BASE.includes("fapi.");
const ACCOUNT_ENDPOINT = IS_FUTURES ? "/fapi/v2/account" : "/api/v3/account";

type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; msg: string };

export async function verifyBinanceKey(
  apiKey: string,
  secret: string
): Promise<VerifyResult> {
  if (process.env.BINANCE_VERIFY_DISABLED === "true") {
    return { ok: true };
  }

  const qs = new URLSearchParams({
    timestamp: Date.now().toString(),
    recvWindow: "5000",
  });

  const signature = crypto
    .createHmac("sha256", secret)
    .update(qs.toString())
    .digest("hex");

  qs.append("signature", signature);

  const res = await fetch(`${BASE}${ACCOUNT_ENDPOINT}?${qs.toString()}`, {
    method: "GET",
    headers: { "X-MBX-APIKEY": apiKey },
    cache: "no-store",
  });

  if (res.status === 200) {
    return { ok: true };
  }

  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, msg: text };
}
