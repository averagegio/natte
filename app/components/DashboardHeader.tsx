"use client";

import { useRef, useState } from "react";
import { getAvatarColor, getInitials } from "@/lib/avatar";

type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
  profile_pic: string | null;
};

type Props = {
  user: DashboardUser;
  onUpdate: (user: DashboardUser) => void;
};

export default function DashboardHeader({ user, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [profilePic, setProfilePic] = useState(user.profile_pic ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(user.name, user.email);
  const avatarColor = getAvatarColor(user.email);

  async function saveProfile() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, profile_pic: profilePic || null }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to save profile");
        return;
      }

      onUpdate(json.user);
      setEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 500_000) {
      setError("Image must be under 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfilePic(reader.result);
        setEditing(true);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="relative">
            {user.profile_pic ? (
              <img
                src={user.profile_pic}
                alt={user.name || user.email}
                className="h-20 w-20 rounded-full border-2 border-white/10 object-cover"
              />
            ) : (
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br ${avatarColor} text-2xl font-bold text-white`}
              >
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black text-white/70 transition hover:border-white/40 hover:text-white"
              aria-label="Change profile picture"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 10l8-8M9 2h3v3M5 9l-1 3 3-1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-sky-300">Dashboard</p>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {user.name || "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-white/50">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="self-start rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10"
        >
          {editing ? "Cancel" : "Edit profile"}
        </button>
      </div>

      {editing && (
        <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-white/70">
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="profile-pic-url" className="block text-sm font-medium text-white/70">
              Profile picture URL
            </label>
            <input
              id="profile-pic-url"
              type="url"
              value={profilePic.startsWith("data:") ? "" : profilePic}
              onChange={(e) => setProfilePic(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white placeholder:text-white/30 focus:border-sky-500/50 focus:outline-none"
              placeholder="https://example.com/avatar.jpg"
            />
            {profilePic.startsWith("data:") && (
              <p className="mt-2 text-xs text-emerald-400">Image uploaded — save to apply.</p>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      )}
    </header>
  );
}
