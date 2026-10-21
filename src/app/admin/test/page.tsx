import { AdminShell, PageHeader } from "@/components/layout";
import { TestConsole } from "@/features/test-console";

export const metadata = { title: "Test console | Forge Hire" };

export default function TestPage() {
  return (
    <AdminShell active="test">
      <PageHeader crumb="Forge Hire" title="Test console" />
      <TestConsole />
    </AdminShell>
  );
}
