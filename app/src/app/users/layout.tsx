import WorkspaceShell from "@/components/workspace-shell";

export const dynamic = "force-dynamic";

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}