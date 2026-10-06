import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";
import { requireAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/authorization";

export default async function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAuthContext();
  const canManageUsers = hasPermission(
    { permissions: context.permissions },
    "users.manage",
  );
  const canViewProducts = hasPermission(
    { permissions: context.permissions },
    "products.view",
  );
  const canViewCustomers = hasPermission(
    { permissions: context.permissions },
    "customers.view",
  );
  const canViewRawMaterials = hasPermission(
    { permissions: context.permissions },
    "raw_materials.view",
  );
  const canViewInventory = hasPermission(
    { permissions: context.permissions },
    "inventory.view",
  );
  const canViewSuppliers = hasPermission(
    { permissions: context.permissions },
    "suppliers.view",
  );
  const canViewPurchases = hasPermission(
    { permissions: context.permissions },
    "purchases.view",
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="grid h-8 w-8 grid-cols-2 gap-0.5 rounded-sm bg-[var(--accent)] p-1.5" aria-hidden="true">
              <span className="bg-white" />
              <span className="bg-white/60" />
              <span className="bg-white/60" />
              <span className="bg-white" />
            </span>
            <span>Manufacturing Workspace</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm" aria-label="Account navigation">
            <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/">
              Account
            </Link>
            {canViewProducts && (
              <>
                <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/products">
                  Products
                </Link>
                <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/categories">
                  Categories
                </Link>
              </>
            )}
            {canViewCustomers && (
              <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/customers">
                Customers
              </Link>
            )}
            {canViewSuppliers && (
              <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/suppliers">
                Suppliers
              </Link>
            )}
            {canViewPurchases && (
              <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/purchases">
                Purchases
              </Link>
            )}
            {canViewRawMaterials && (
              <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/raw-materials">
                Raw materials
              </Link>
            )}
            {canViewInventory && (
              <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/inventory">
                Inventory
              </Link>
            )}
            {canManageUsers && (
              <Link className="text-[var(--muted)] hover:text-[var(--foreground)]" href="/users">
                Users
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{context.user.name}</p>
              <p className="text-xs text-[var(--muted)]">{context.role?.name ?? "No role assigned"}</p>
            </div>
            <form action={signOutAction}>
              <button className="rounded-sm border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-[var(--background)]" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}