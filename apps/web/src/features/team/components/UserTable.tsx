import { useState } from "react";
import type { PublicUser, Role } from "@bismo/shared-schemas";
import { Button, Select, StatusBadge } from "@bismo/ui";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-client";
import { useUpdateUserRole, useUpdateUserStatus, useUsers } from "../queries";

const STATUS_VARIANT = {
  active: "approved",
  disabled: "rejected",
  pending_activation: "pending",
} as const;

const STATUS_LABEL = {
  active: "Active",
  disabled: "Disabled",
  pending_activation: "Pending Activation",
} as const;

export function UserTable() {
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (id: string, role: Role) => {
    setError(null);
    try {
      await updateRole.mutateAsync({ id, role });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const handleStatusToggle = async (user: PublicUser) => {
    setError(null);
    try {
      await updateStatus.mutateAsync({
        id: user.id,
        status: user.status === "disabled" ? "active" : "disabled",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  if (isLoading) return <p className="text-sm text-[var(--bismo-text-muted)]">Loading team…</p>;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-[var(--bismo-status-rejected)]">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-[var(--bismo-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--bismo-border)] text-left text-xs uppercase tracking-wide text-[var(--bismo-text-muted)]">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((user) => {
              const isSelf = user.id === currentUser?.id;
              return (
                <tr key={user.id} className="border-b border-[var(--bismo-border)] last:border-0">
                  <td className="px-4 py-2 text-[var(--bismo-text)]">
                    {user.name} {isSelf && <span className="text-xs text-[var(--bismo-text-muted)]">(you)</span>}
                  </td>
                  <td className="px-4 py-2 text-[var(--bismo-text-muted)]">{user.email}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={user.role}
                      disabled={isSelf || updateRole.isPending}
                      onValueChange={(role) => handleRoleChange(user.id, role as Role)}
                      options={[
                        { value: "author", label: "Author" },
                        { value: "admin", label: "Admin" },
                      ]}
                      className="min-w-28"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge variant={STATUS_VARIANT[user.status]}>
                      {STATUS_LABEL[user.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {user.status !== "pending_activation" && (
                      <Button
                        size="sm"
                        variant={user.status === "disabled" ? "secondary" : "destructive"}
                        disabled={isSelf || updateStatus.isPending}
                        onClick={() => handleStatusToggle(user)}
                      >
                        {user.status === "disabled" ? "Enable" : "Disable"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
