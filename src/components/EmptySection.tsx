import { FileQuestion } from 'lucide-react';

interface EmptySectionProps {
  label: string;
}

export function EmptySection({ label }: EmptySectionProps) {
  return (
    <div className="flex items-center gap-2 text-muted text-sm py-3 px-4 bg-fog rounded-lg border border-border border-dashed">
      <FileQuestion className="w-4 h-4 shrink-0" />
      <span>No {label} found in this paper</span>
    </div>
  );
}
