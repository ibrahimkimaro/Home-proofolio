"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Ban,
  CheckCircle2,
  Shield,
  ShieldOff,
  Trash2,
  UserCog,
  X,
  Check,
  Briefcase,
  Sparkles,
} from "lucide-react";
import {
  deleteAdminUser,
  updateAdminUser,
  fetchOnboarding,
  type AdminUser,
} from "@/lib/api";
import {
  Avatar,
  Badge,
  ConfirmButton,
  EmptyRow,
  FilterSelect,
  Panel,
  SearchInput,
  formatDate,
  td,
  th,
} from "./ui";

type Filter = "all" | "active" | "suspended" | "admins";

const FALLBACK_SYSTEM_ROLES = [
  { key: "developer", label: "Software Developer", category: "Tech & Engineering" },
  { key: "backend-dev", label: "Backend & API Engineer", category: "Tech & Engineering" },
  { key: "mobile-dev", label: "Mobile Developer", category: "Tech & Engineering" },
  { key: "devops-cloud", label: "DevOps & Cloud Engineer", category: "Tech & Engineering" },
  { key: "ai-ml", label: "AI & Machine Learning", category: "Tech & Engineering" },
  { key: "cybersecurity", label: "Cybersecurity Analyst", category: "Tech & Engineering" },
  { key: "hardware-eng", label: "Hardware / Embedded Engineer", category: "Tech & Engineering" },
  { key: "designer", label: "UI/UX & Product Designer", category: "Design & Media" },
  { key: "brand-designer", label: "Brand & Graphic Designer", category: "Design & Media" },
  { key: "writer", label: "Writer & Journalist", category: "Design & Media" },
  { key: "videographer", label: "Videographer & Media Creator", category: "Design & Media" },
  { key: "architect", label: "Architect & Spatial Designer", category: "Design & Media" },
  { key: "accountant", label: "Accountant & Auditor", category: "Business & Finance" },
  { key: "founder", label: "Founder & Entrepreneur", category: "Business & Finance" },
  { key: "product-manager", label: "Product Manager", category: "Business & Finance" },
  { key: "financial-analyst", label: "Financial Analyst", category: "Business & Finance" },
  { key: "legal-compliance", label: "Legal & Compliance", category: "Business & Finance" },
  { key: "marketing-growth", label: "Marketing & Growth", category: "Business & Finance" },
  { key: "student", label: "Student & Apprentice", category: "Science & Education" },
  { key: "researcher", label: "Academic Researcher", category: "Science & Education" },
  { key: "data-scientist", label: "Data Scientist", category: "Science & Education" },
  { key: "educator", label: "Educator & Teacher", category: "Science & Education" },
  { key: "environmental", label: "Environmental Scientist", category: "Science & Education" },
  { key: "doctor", label: "Doctor & Clinical Officer", category: "Health & Wellbeing" },
  { key: "pharmacist", label: "Pharmacist", category: "Health & Wellbeing" },
  { key: "ngo-leader", label: "NGO & Community Leader", category: "Health & Wellbeing" },
  { key: "athlete", label: "Footballer & Athlete", category: "Athletics & Sports" },
  { key: "coach", label: "Coach & Sports Trainer", category: "Athletics & Sports" },
  { key: "supply-chain", label: "Supply Chain & Logistics", category: "Trades & Operations" },
  { key: "agriculture", label: "Agriculturalist & Producer", category: "Trades & Operations" },
  { key: "technician", label: "Electrical / Mechanical Tech", category: "Trades & Operations" },
  { key: "other", label: "General / Multidisciplinary", category: "Trades & Operations" },
];

export function UsersSection({
  users,
  currentAdminId,
  onChanged,
  onError,
}: {
  users: AdminUser[];
  currentAdminId: string;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [systemRoles, setSystemRoles] = useState(FALLBACK_SYSTEM_ROLES);

  // Load real system roles dynamically from backend platform content
  useEffect(() => {
    fetchOnboarding()
      .then((data) => {
        if (data.roles?.length) {
          const catMap = new Map(data.categories.map((c) => [c.key, c.label]));
          setSystemRoles(
            data.roles.map((r) => ({
              key: r.key,
              label: r.label,
              category: catMap.get(r.category_key) || "General",
            }))
          );
        }
      })
      .catch(() => {
        // Fallback already pre-set
      });
  }, []);

  const q = query.toLowerCase();
  const rows = users.filter((u) => {
    if (filter === "active" && !u.is_active) return false;
    if (filter === "suspended" && u.is_active) return false;
    if (filter === "admins" && !u.is_admin) return false;
    return [
      u.fullname,
      u.username,
      u.email,
      u.phone_number ?? "",
      u.role ?? "",
      u.headline ?? "",
    ].some((v) => v?.toLowerCase().includes(q));
  });

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <>
      <Panel
        icon={Users}
        title="User accounts"
        subtitle={`${rows.length} of ${users.length} shown`}
        actions={
          <>
            <FilterSelect
              label="Filter users"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All users" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "admins", label: "Admins" },
              ]}
            />
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by name, role, email…"
            />
          </>
        }
      >
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[1080px] text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-hairline/70">
                <th className={`${th} min-w-[200px]`}>User</th>
                <th className={`${th} min-w-[220px]`}>Real Role & Discipline</th>
                <th className={`${th} min-w-[190px]`}>Contact</th>
                <th className={`${th} w-[100px] min-w-[100px]`}>Status</th>
                <th className={`${th} w-[110px] min-w-[110px]`}>Joined</th>
                <th className={`${th} w-[260px] min-w-[260px] text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/50">
              {rows.length === 0 ? (
                <EmptyRow colSpan={6}>
                  {users.length ? "No users match these filters." : "No registered users yet."}
                </EmptyRow>
              ) : (
                rows.map((u) => {
                  const isSelf = u.id === currentAdminId;
                  const displayRole = u.role || u.headline || (u.roles && u.roles[0]) || null;
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-paper-dim/60">
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullname || u.username} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-800">
                              {u.fullname || "Unnamed"}{" "}
                              {isSelf && <span className="text-[11px] font-normal text-slate">(you)</span>}
                            </p>
                            <p className="truncate font-mono text-[12px] text-slate">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className={td}>
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {displayRole ? (
                              <span className="font-semibold text-ink-800 text-[13px] inline-flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5 text-brass-dark shrink-0" />
                                {displayRole}
                              </span>
                            ) : (
                              <span className="text-slate text-[12px] italic">No discipline set</span>
                            )}
                            {u.is_admin ? (
                              <Badge tone="accent">Admin</Badge>
                            ) : (
                              <Badge>Member</Badge>
                            )}
                          </div>
                          {u.headline && u.headline !== displayRole && (
                            <span className="truncate max-w-[240px] text-[11px] text-slate" title={u.headline}>
                              {u.headline}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={td}>
                        <p className="truncate text-ink-700 font-medium">{u.email}</p>
                        <p className="font-mono text-[12px] text-slate">{u.phone_number || "No phone"}</p>
                      </td>

                      <td className={td}>
                        {u.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Suspended</Badge>}
                      </td>

                      <td className={`${td} whitespace-nowrap text-slate font-mono text-[12px]`}>
                        {formatDate(u.created_at)}
                      </td>

                      <td className={`${td} text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-hairline/80 bg-paper px-2.5 text-[12px] font-medium text-ink-700 shadow-2xs transition-all hover:border-brass hover:bg-brass/10 hover:text-brass-dark active:scale-95 cursor-pointer"
                            title="Edit real role and permissions"
                          >
                            <UserCog className="h-3.5 w-3.5 text-brass-dark shrink-0" />
                            <span>Role</span>
                          </button>

                          <ConfirmButton
                            disabled={isSelf}
                            title={u.is_active ? "Suspend account" : "Reactivate account"}
                            danger={u.is_active}
                            confirmLabel={u.is_active ? "Suspend?" : "Activate?"}
                            onConfirm={() => run(() => updateAdminUser(u.id, { is_active: !u.is_active }))}
                            className="shrink-0 shadow-2xs"
                          >
                            {u.is_active ? <Ban className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                            <span>{u.is_active ? "Suspend" : "Activate"}</span>
                          </ConfirmButton>

                          <ConfirmButton
                            disabled={isSelf}
                            title={u.is_admin ? "Demote to Member" : "Promote to Admin"}
                            confirmLabel={u.is_admin ? "Demote?" : "Promote?"}
                            onConfirm={() => run(() => updateAdminUser(u.id, { is_admin: !u.is_admin }))}
                            className="shrink-0 shadow-2xs"
                          >
                            {u.is_admin ? <ShieldOff className="h-3.5 w-3.5 shrink-0" /> : <Shield className="h-3.5 w-3.5 shrink-0" />}
                            <span>{u.is_admin ? "Demote" : "Promote"}</span>
                          </ConfirmButton>

                          <ConfirmButton
                            disabled={isSelf}
                            danger
                            title="Delete user and all their works"
                            confirmLabel="Delete?"
                            onConfirm={() => run(() => deleteAdminUser(u.id))}
                            className="shrink-0 shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          </ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Edit Role Modal */}
      {editingUser && (
        <EditRoleModal
          user={editingUser}
          systemRoles={systemRoles}
          isSelf={editingUser.id === currentAdminId}
          onClose={() => setEditingUser(null)}
          onSave={async (patch) => {
            await run(() => updateAdminUser(editingUser.id, patch));
            setEditingUser(null);
          }}
        />
      )}
    </>
  );
}

function EditRoleModal({
  user,
  systemRoles,
  isSelf,
  onClose,
  onSave,
}: {
  user: AdminUser;
  systemRoles: { key: string; label: string; category: string }[];
  isSelf: boolean;
  onClose: () => void;
  onSave: (patch: {
    role_title?: string;
    headline?: string;
    is_admin?: boolean;
  }) => Promise<void>;
}) {
  const currentRole = user.role || (user.roles && user.roles[0]) || "";
  const matchedRole = systemRoles.find(
    (r) => r.label.toLowerCase() === currentRole.toLowerCase() || r.key === currentRole.toLowerCase()
  );

  const [selectedPreset, setSelectedPreset] = useState<string>(
    matchedRole ? matchedRole.label : currentRole ? "custom" : "Software Developer"
  );
  const [roleTitle, setRoleTitle] = useState<string>(
    currentRole || matchedRole?.label || "Software Developer"
  );
  const [headline, setHeadline] = useState<string>(user.headline || currentRole || "");
  const [isAdmin, setIsAdmin] = useState<boolean>(user.is_admin);
  const [busy, setBusy] = useState(false);

  // Group roles by category
  const categories = Array.from(new Set(systemRoles.map((r) => r.category)));

  function handlePresetChange(val: string) {
    setSelectedPreset(val);
    if (val !== "custom") {
      setRoleTitle(val);
      if (!headline || headline === roleTitle) {
        setHeadline(val);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const finalTitle = selectedPreset === "custom" ? roleTitle.trim() : selectedPreset;
      await onSave({
        role_title: finalTitle,
        headline: headline.trim() || finalTitle,
        is_admin: isAdmin,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-hairline/80 bg-paper p-6 shadow-xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-hairline/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass/15 text-brass-dark">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-ink-800">
                Edit Role & Discipline
              </h3>
              <p className="text-[12px] text-slate">
                {user.fullname || "User"} (@{user.username})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate hover:bg-paper-dim hover:text-ink-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Real System Role / Discipline */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-700 mb-1">
              Real System Role / Discipline
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-hairline bg-paper px-3 text-[13px] text-ink-800 outline-none focus:border-brass cursor-pointer"
            >
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {systemRoles
                    .filter((r) => r.category === cat)
                    .map((r) => (
                      <option key={r.key} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                </optgroup>
              ))}
              <option value="custom">-- Custom Role / Specific Title --</option>
            </select>
          </div>

          {/* Custom role title if custom chosen */}
          {selectedPreset === "custom" && (
            <div>
              <label className="block text-[12px] font-semibold text-ink-700 mb-1">
                Custom Role Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Lead Systems Architect"
                required
                maxLength={100}
                className="h-10 w-full rounded-xl border border-hairline bg-paper px-3 text-[13px] text-ink-800 outline-none focus:border-brass"
              />
            </div>
          )}

          {/* Profile Headline */}
          <div>
            <label className="block text-[12px] font-semibold text-ink-700 mb-1">
              Professional Headline on Profile
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Cybersecurity analyst and software developer"
              maxLength={160}
              className="h-10 w-full rounded-xl border border-hairline bg-paper px-3 text-[13px] text-ink-800 outline-none focus:border-brass"
            />
            <p className="mt-1 text-[11px] text-slate">
              Displayed on public profile cards and header.
            </p>
          </div>

          {/* Platform Access Role */}
          <div className="pt-2">
            <label className="block text-[12px] font-semibold text-ink-700 mb-2">
              Platform Permission Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${!isAdmin
                    ? "border-brass bg-brass/10 font-semibold text-ink-800"
                    : "border-hairline bg-paper text-slate hover:border-hairline/80"
                  }`}
              >
                <input
                  type="radio"
                  name="isAdmin"
                  checked={!isAdmin}
                  onChange={() => setIsAdmin(false)}
                  disabled={isSelf}
                  className="accent-brass"
                />
                <div>
                  <p className="text-[13px]">Member</p>
                  <p className="text-[11px] font-normal text-slate">Standard user</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${isAdmin
                    ? "border-brass bg-brass/10 font-semibold text-ink-800"
                    : "border-hairline bg-paper text-slate hover:border-hairline/80"
                  }`}
              >
                <input
                  type="radio"
                  name="isAdmin"
                  checked={isAdmin}
                  onChange={() => setIsAdmin(true)}
                  disabled={isSelf}
                  className="accent-brass"
                />
                <div>
                  <p className="text-[13px]">Administrator</p>
                  <p className="text-[11px] font-normal text-slate">Full console access</p>
                </div>
              </label>
            </div>
            {isSelf && (
              <p className="mt-1 text-[11px] text-slate italic">
                You cannot modify your own administrator status.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-hairline/60">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-hairline px-4 text-[13px] font-medium text-slate hover:bg-paper-dim cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !roleTitle.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink px-4 text-[13px] font-semibold text-paper hover:bg-ink-700 disabled:opacity-40 cursor-pointer transition-colors"
            >
              <Check className="h-4 w-4" />
              <span>{busy ? "Saving…" : "Save Role"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
