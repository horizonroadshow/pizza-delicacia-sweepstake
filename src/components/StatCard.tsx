type StatCardProps = {
  compact?: boolean;
  detail?: string;
  icon: string;
  label: string;
  variant?: "default" | "glass" | "premium";
  value: string;
};

export function StatCard({
  compact = false,
  detail,
  icon,
  label,
  value,
  variant = "default",
}: StatCardProps) {
  const isPremium = variant === "premium";
  const isGlass = variant === "glass";

  return (
    <div
      className={`rounded-lg border shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition ${
        isPremium
          ? "formidable-metal-card"
          : isGlass
            ? "apple-glass-card"
          : "border-[#c7a653]/30 bg-[#16241f] hover:border-[#d7b85f]/60 hover:bg-[#1b2b25]"
      } ${
        compact ? "p-3 lg:p-3.5" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
          {label}
        </p>
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${
            isPremium
              ? "border border-[#d6a93a]/30 bg-[#0d0a06] text-[#f0d88b] shadow-[0_0_18px_rgba(214,169,58,0.12)]"
              : isGlass
                ? "apple-glass-chip text-[#f8fbff]"
              : "text-[#f0d88b]"
          }`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-3 break-words font-black text-[#fff4d7] ${
          compact ? "text-2xl" : "text-3xl"
        } ${isPremium ? "formidable-gold-text" : ""} ${
          isGlass ? "apple-glass-value" : ""
        }`}
      >
        {value}
      </p>
      {detail ? (
        <p
          className={`mt-1 text-sm font-semibold ${
            isPremium ? "text-[#bfb7a0]" : "text-[#b8c0ae]"
          }`}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}
