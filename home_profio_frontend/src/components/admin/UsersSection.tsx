"use client";

import { useState } from "react";
import { Users, Ban, CheckCircle2, Shield, ShieldOff, Trash2 } from "lucide-react";
import { deleteAdminUser, updateAdminUser, type AdminUser } from "@/lib/api";
import { Avatar, Badge, ConfirmButton, EmptyRow, FilterSelect, Panel, SearchInput, formatDate, td, th } from "./ui";

type Filter = "all" | "active" | "suspended" | "admins";

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

  const q = query.toLowerCase();
  const rows = users.filter((u) => {
    if (filter === "active" && !u.is_active) return false;
    if (filter === "suspended" && u.is_active) return false;
    if (filter === "admins" && !u.is_admin) return false;
    return [u.fullname, u.username, u.email, u.phone_number ?? ""].some((v) => v?.toLowerCase().includes(q));
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
          <SearchInput value={query} onChange={setQuery} placeholder="Search users…" />
        </>
      }
    >
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr className="border-b border-hairline/70">
              <th className={th}>User</th>
              <th className={th}>Contact</th>
              <th className={th}>Role</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Works</th>
              <th className={th}>Joined</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/50">
            {rows.length === 0 ? (
              <EmptyRow colSpan={7}>{users.length ? "No users match these filters." : "No registered users yet."}</EmptyRow>
            ) : (
              rows.map((u) => {
                const isSelf = u.id === currentAdminId;
                return (
                  <tr key={u.id} className="transition-colors hover:bg-paper-dim/60">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullname || u.username} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-800">
                            {u.fullname || "Unnamed"} {isSelf && <span className="text-[11px] font-normal text-slate">(you)</span>}
                          </p>
                          <p className="truncate font-mono text-[12px] text-slate">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <p className="truncate text-ink-700">{u.email}</p>
                      <p className="font-mono text-[12px] text-slate">{u.phone_number || "No phone"}</p>
                    </td>
                    <td className={td}>{u.is_admin ? <Badge tone="accent">Admin</Badge> : <Badge>Member</Badge>}</td>
                    <td className={td}>{u.is_active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Suspended</Badge>}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{u.works_count}</td>
                    <td className={`${td} whitespace-nowrap text-slate`}>{formatDate(u.created_at)}</td>
                    <td className={td}>
                      <div className="flex justify-end gap-1.5">
                        <ConfirmButton
                          disabled={isSelf}
                          title={u.is_active ? "Suspend account" : "Reactivate account"}
                          danger={u.is_active}
                          confirmLabel={u.is_active ? "Suspend?" : "Activate?"}
                          onConfirm={() => run(() => updateAdminUser(u.id, { is_active: !u.is_active }))}
                        >
                          {u.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          <span className="hidden xl:inline">{u.is_active ? "Suspend" : "Activate"}</span>
                        </ConfirmButton>
                        <ConfirmButton
                          disabled={isSelf}
                          title={u.is_admin ? "Remove admin role" : "Make admin"}
                          confirmLabel={u.is_admin ? "Demote?" : "Promote?"}
                          onConfirm={() => run(() => updateAdminUser(u.id, { is_admin: !u.is_admin }))}
                        >
                          {u.is_admin ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                          <span className="hidden xl:inline">{u.is_admin ? "Demote" : "Promote"}</span>
                        </ConfirmButton>
                        <ConfirmButton
                          disabled={isSelf}
                          danger
                          title="Delete user and all their works"
                          confirmLabel="Delete?"
                          onConfirm={() => run(() => deleteAdminUser(u.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
  );
}
