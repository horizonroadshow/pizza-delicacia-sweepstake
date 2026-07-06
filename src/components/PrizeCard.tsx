type PrizeCardProps = {
  compact?: boolean;
  note?: string;
  place: string;
  prize: string;
};

export function PrizeCard({ compact = false, note, place, prize }: PrizeCardProps) {
  return (
    <div
      className={`rounded-lg border border-[#c7a653]/35 bg-[#111d19] shadow-[0_18px_45px_rgba(0,0,0,0.2)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
        {place}
      </p>
      <p
        className={`mt-2 break-words font-black leading-tight text-[#fff4d7] ${
          compact ? "text-2xl xl:text-3xl" : "text-4xl"
        }`}
      >
        {prize}
      </p>
      {note ? (
        <p className="mt-2 text-base leading-7 text-[#b8c0ae]">{note}</p>
      ) : null}
    </div>
  );
}
