"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  AdminOtpLog,
  AdminStats,
  AdminUser,
  AdminWork,
  ApiError,
  User,
  fetchAdminOtps,
  fetchAdminStats,
  fetchAdminUsers,
  fetchAdminWorks,
  fetchCurrentUser,
  loginUser,
  logoutUser,
} from "@/lib/api";
import { AdminLoginGate } from "@/components/admin/AdminLoginGate";
import { adoptAccountAppearance, type Appearance } from "@/lib/appearance";
import { AdminShell, NAV, type AdminSection } from "@/components/admin/AdminShell";
import { OverviewSection } from "@/components/admin/OverviewSection";
import { UsersSection } from "@/components/admin/UsersSection";
import { WorksSection } from "@/components/admin/WorksSection";
import { SecuritySection } from "@/components/admin/SecuritySection";
import { AnalyticsSection } from "@/components/admin/AnalyticsSection";
import { OnboardingSection } from "@/components/admin/OnboardingSection";
import { AuditSection, BusinessesSection, PlatformSection, TemplatesSection } from "@/components/admin/ManageSections";
import { SupportSection } from "@/components/admin/SupportSection";
import { ChatNotifier, unreadTotal, useChatInbox } from "@/components/chat/ChatNotifier";
import { ChatSection } from "@/components/admin/ChatSection";
import { DevicesSection, HealthSection, MessagesSection, ThreatsSection } from "@/components/admin/MonitorSections";

export default function AdminPage() {
  const [authStatus, setAuthStatus] = useState<"checking" | "login" | "denied" | "ok">("checking");
  const [adminUser, setAdminUser] = useState<User | null>(null);

  useEffect(() => {
    fetchCurrentUser()
      .then((u) => {
        adoptAccountAppearance(u.preferences?.appearance as Partial<Appearance> | undefined);
        setAdminUser(u);
        setAuthStatus(u.is_admin ? "ok" : "denied");
      })
      .catch(() => setAuthStatus("login"));
  }, []);

  async function handleAdminLogin(email: string, password: string) {
    const u = await loginUser({ email, password });
    setAdminUser(u);
    if (!u.is_admin) {
      setAuthStatus("denied");
      throw new ApiError(403, "This account does not have admin access.");
    }
    setAuthStatus("ok");
  }

  async function handleAdminLogout() {
    await logoutUser().catch(() => {});
    setAdminUser(null);
    setAuthStatus("login");
  }

  if (authStatus !== "ok" || !adminUser) {
    return (
      <AdminLoginGate
        status={authStatus === "ok" ? "checking" : authStatus}
        adminUser={adminUser}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
      />
    );
  }

  return <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />;
}

function sectionFromHash(): AdminSection {
  const h = window.location.hash.slice(1);
  return NAV.some((n) => n.id === h) ? (h as AdminSection) : "overview";
}

function AdminDashboard({ admin, onLogout }: { admin: User; onLogout: () => void }) {
  const inbox = useChatInbox(admin.id);
  const [section, setSection] = useState<AdminSection>(sectionFromHash);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [works, setWorks] = useState<AdminWork[]>([]);
  const [otps, setOtps] = useState<AdminOtpLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Section lives in the URL hash so refresh/back keep your place.
  useEffect(() => {
    const sync = () => setSection(sectionFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function navigate(s: AdminSection) {
    window.location.hash = s;
    window.scrollTo({ top: 0 });
  }

  const loadData = useCallback(async () => {
    try {
      const [s, u, w, o] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminWorks(),
        fetchAdminOtps(100),
      ]);
      setStats(s);
      setUsers(u);
      setWorks(w);
      setOtps(o);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return onLogout();
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    }
  }, [onLogout]);

  useEffect(() => {
    // setState only runs after the awaited fetches resolve, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // ponytail: 15s polling; switch to SSE/websocket if admins need true real-time.
    const id = setInterval(() => document.visibilityState === "visible" && loadData(), 15000);
    return () => clearInterval(id);
  }, [loadData]);

  async function refresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <AdminShell
      section={section}
      onNavigate={navigate}
      counts={{ users: users.length, works: works.length, security: otps.length, support: unreadTotal(inbox) }}
      admin={admin}
      onLogout={onLogout}
      onRefresh={refresh}
      refreshing={refreshing}
      lastUpdated={lastUpdated}
    >
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-berry/30 bg-berry/10 px-4 py-3 text-[13px] font-medium text-berry">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {section === "overview" && (
        <OverviewSection stats={stats} users={users} works={works} otps={otps} onNavigate={navigate} />
      )}
      {section === "users" && (
        <UsersSection users={users} currentAdminId={admin.id} onChanged={loadData} onError={setError} />
      )}
      {section === "works" && <WorksSection works={works} onChanged={loadData} onError={setError} />}
      {section === "security" && <SecuritySection otps={otps} onChanged={loadData} onError={setError} />}
      {section === "analytics" && <AnalyticsSection onError={setError} />}
      {section === "onboarding" && <OnboardingSection onError={setError} />}
      {section === "templates" && <TemplatesSection onError={setError} />}
      {section === "businesses" && <BusinessesSection onError={setError} />}
      {section === "platform" && <PlatformSection onError={setError} />}
      {section === "audit" && <AuditSection onError={setError} />}
      {section === "threats" && <ThreatsSection onError={setError} />}
      {section === "devices" && <DevicesSection onError={setError} />}
      {section === "health" && <HealthSection onError={setError} />}
      {section === "messages" && <MessagesSection onError={setError} />}
      {section === "support" && <SupportSection admin={admin} onError={setError} />}
      {section === "chat" && <ChatSection admin={admin} onError={setError} />}
      <ChatNotifier userId={admin.id} />
    </AdminShell>
  );
}
