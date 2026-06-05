interface StatProps {
  label: string;
  value: string;
}

export function Stat({ label, value }: StatProps) {
  return (
    <div className="border border-border rounded-lg p-3.5 bg-fog">
      <div className="text-[11px] font-semibold text-muted mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink break-all">{value}</div>
    </div>
  );
}
