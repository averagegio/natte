"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "../components/DashboardHeader";
import SideDrawer from "../components/SideDrawer";
import StarConstellation from "../components/StarConstellation";
import WidgetConnectionsList, {
  type WidgetConnection,
} from "../components/WidgetConnectionsList";
import SubscriptionStatus, {
  type SubscriptionInfo,
} from "../components/SubscriptionStatus";

type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
  profile_pic: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [connections, setConnections] = useState<WidgetConnection[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthMessage, setOauthMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xConnected = params.get("x_connected");
    const xError = params.get("x_error");

    if (xConnected) {
      setOauthMessage({
        type: "success",
        text: `Connected @${xConnected} via your X Developer App.`,
      });
      router.replace("/dashboard");
    } else if (xError) {
      setOauthMessage({
        type: "error",
        text: `X connection failed: ${xError}`,
      });
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.status === 401) {
          router.replace("/signup");
          return;
        }
        const json = await res.json();
        if (!res.ok) {
          router.replace("/signup");
          return;
        }
        setUser(json.user);
        setConnections(json.connections);
        setSubscription(json.subscription ?? null);
      } catch {
        router.replace("/signup");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/50">
        Loading dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black">
      <SideDrawer />

      <div className="pointer-events-none fixed inset-0 z-0">
        <StarConstellation />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-16 sm:px-10">
        <DashboardHeader user={user} onUpdate={setUser} />

        <div className="mt-10">
          <SubscriptionStatus subscription={subscription} onSync={setSubscription} />
          <WidgetConnectionsList
            connections={connections}
            onChange={setConnections}
            oauthMessage={oauthMessage}
          />
        </div>
      </div>
    </div>
  );
}
