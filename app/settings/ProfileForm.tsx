
"use client";

import { useTransition } from "react";
import { updateProfile } from "./actions";

export default function ProfileForm({
  user,
}: {
  user: { name: string | null; email: string; timezone?: string | null };
}) {
  const [pending, start] = useTransition();

  return (
    <form
      className="glass p-4 space-y-4"
      action={(fd) => start(() => updateProfile(fd))}
    >
      <div>
        <label className="text-sm text-zinc-400">Name</label>
        <input name="name" defaultValue={user.name ?? ""} className="input" />
      </div>

      <div>
        <label className="text-sm text-zinc-400">Email</label>
        <input value={user.email} disabled className="input opacity-70" />
      </div>

      <div>
        <label className="text-sm text-zinc-400">Timezone</label>
        <input name="timezone" defaultValue={user.timezone ?? "UTC"} className="input" />
      </div>

      <button disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
