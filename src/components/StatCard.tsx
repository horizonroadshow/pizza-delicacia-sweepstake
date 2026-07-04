type StatCardProps = {
  detail?: string;
  icon: string;
  label: string;
  value: string;
};

export function StatCard({ detail, icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-[#c7a653]/30 bg-[#16241f] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition hover:border-[#d7b85f]/60 hover:bg-[#1b2b25]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
          {label}
        </p>
        <span aria-hidden="true" className="text-lg text-[#f0d88b]">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-black text-[#fff4d7]">{value}</p>
      {detail ? (
        <p className="mt-1 text-sm font-semibold text-[#b8c0ae]">{detail}</p>
      ) : null}
    </div>
  );
}
