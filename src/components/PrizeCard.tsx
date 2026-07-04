type PrizeCardProps = {
  note: string;
  place: string;
  prize: string;
};

export function PrizeCard({ note, place, prize }: PrizeCardProps) {
  return (
    <div className="rounded-lg border border-[#c7a653]/35 bg-[#111d19] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
        {place}
      </p>
      <p className="mt-2 text-4xl font-black text-[#fff4d7]">{prize}</p>
      <p className="mt-2 text-base leading-7 text-[#b8c0ae]">{note}</p>
    </div>
  );
}
