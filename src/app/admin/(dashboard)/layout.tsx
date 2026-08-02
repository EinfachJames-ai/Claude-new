import { getSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/admin/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col justify-between bg-anthracite px-4 py-6">
        <div>
          <p className="mb-8 px-3 font-serif text-lg font-bold text-cream">
            Zur rostigen Gabel
          </p>
          <AdminNav />
        </div>
        <div className="space-y-3 px-3">
          {session && <p className="truncate text-xs text-cream/60">{session.email}</p>}
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
