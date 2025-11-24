
import { prisma } from "@/lib/prisma";
import { authUserId } from "@/lib/auth";
import ProfileForm from "../ProfileForm";

export default async function ProfilePage() {
  const userId = await authUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, timezone: true },
  });
  if (!user) return null;
  return <ProfileForm user={user} />;
}
