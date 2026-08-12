import { StatusPage } from "@/components/layout/StatusPage";

export default function Custom404Page() {
  return (
    <div className="fixed inset-0 z-[100]">
      <StatusPage code="404" />
    </div>
  );
}
