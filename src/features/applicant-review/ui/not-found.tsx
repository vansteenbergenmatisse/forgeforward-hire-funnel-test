import { UserX } from "lucide-react";
import { Button } from "@/components/ui";

export function ApplicantNotFound({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-gray-tint text-gray"><UserX className="size-7" aria-hidden /></span>
      <h2 id="drawer-title" className="text-2xl">Applicant not found</h2>
      <p className="text-sm text-muted">This applicant may have been deleted, or the link is out of date.</p>
      <Button variant="dark" onClick={onClose} autoFocus>Close</Button>
    </div>
  );
}
