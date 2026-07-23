"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import GlossyCard from "./GlossyCard";

type Props = {
  hasSubscription: boolean;
};

export default function DeleteAccount({ hasSubscription }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Failed to delete account");
        return;
      }

      router.replace("/signup");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <GlossyCard className="mt-6" id="dashboard-delete-account">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Delete account</h2>
          <p className="mt-2 text-sm text-white/50">
            Permanently remove your profile, connections, and detection history.
            {hasSubscription
              ? " Any active subscription will be cancelled immediately and you will not be billed again."
              : " This cannot be undone."}
          </p>
        </div>

        {!confirming && (
          <button
            type="button"
            onClick={() => {
              setConfirming(true);
              setError(null);
              setConfirmText("");
            }}
            className="self-start rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2 text-sm font-medium text-red-300 transition hover:border-red-500/60 hover:bg-red-500/20"
          >
            Delete account
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
          <p className="text-sm text-white/70">
            Type <span className="font-semibold text-white">DELETE</span> to confirm.
            {hasSubscription && (
              <> Your subscription will be cancelled right away.</>
            )}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
            placeholder="DELETE"
            autoComplete="off"
            disabled={deleting}
          />

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting || confirmText !== "DELETE"}
              className="rounded-full border border-red-500/50 bg-red-500/20 px-6 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={deleting}
              className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </GlossyCard>
  );
}
