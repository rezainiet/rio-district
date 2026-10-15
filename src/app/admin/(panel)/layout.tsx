import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ContactMessage } from "@/models/misc";
import { Order } from "@/models/Order";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin KALT" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await connectDB();
  const [newMessages, pendingOrders] = await Promise.all([
    ContactMessage.countDocuments({ status: "new" }),
    Order.countDocuments({ status: "pending_confirmation" }),
  ]);
  return (
    <div className="min-h-dvh bg-paper">
      <AdminNav email={admin.email} newMessages={newMessages} pendingOrders={pendingOrders} />
      <main className="px-4 py-6 md:ml-60 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
