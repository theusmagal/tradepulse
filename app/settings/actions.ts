
"use server";

import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { verifyBinanceKey } from "@/lib/binance";
import { revalidatePath } from "next/cache";
import { authUserId } from "@/lib/auth";

export async function updateProfile(formData: FormData) {
  const userId = await authUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: formData.get("name")?.toString() || undefined,
      timezone: formData.get("timezone")?.toString() || undefined,
    },
  });
  revalidatePath("/settings/profile");
}

export async function addBinanceKey(formData: FormData) {
  const userId = await authUserId();
  const label = formData.get("label")?.toString() || "Main";
  const apiKey = formData.get("apiKey")!.toString();
  const secret = formData.get("secret")!.toString();

  const check = await verifyBinanceKey(apiKey, secret);
  if (!check.ok) {
    throw new Error(`Binance verification failed (${check.status}): ${check.msg}`);
  }

  await prisma.apiKey.create({
    data: {
      userId,
      provider: "binance",
      label,
      keyLast4: apiKey.slice(-4),
      encApiKey: encrypt(apiKey),
      encSecret: encrypt(secret),
    },
  });
  revalidatePath("/settings/integrations");
}

export async function revokeApiKey(id: string) {
  const userId = await authUserId();
  await prisma.apiKey.updateMany({
    where: { id, userId },
    data: { status: "revoked" },
  });
  revalidatePath("/settings/integrations");
}
