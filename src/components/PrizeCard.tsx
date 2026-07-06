type PrizeCardProps = {
  compact?: boolean;
  note?: string;
  place: string;
  prize: string;
  variant?: "default" | "premium";
};

function premiumPrizeChipLabel(label: string) {
  if (label.includes("?")) {
    return label;
  }

  const withQuestionBeforeTrailingEmoji = label.replace(
    /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)+$/u,
    "?$&",
  );

  return withQuestionBeforeTrailingEmoji === label
    ? `${label}?`
    : withQuestionBeforeTrailingEmoji;
}

export function PrizeCard({
  compact = false,
  note,
  place,
  prize,
  variant = "default",
}: PrizeCardProps) {
  const isPremium = variant === "premium";
  const prizeParts = isPremium ? prize.split(" / ") : [prize];
  const mainPrize = prizeParts[0];
  const extras = prizeParts.slice(1);

  return (
    <div
      className={`rounded-lg border shadow-[0_18px_45px_rgba(0,0,0,0.2)] ${
        isPremium
          ? "formidable-metal-card"
          : "border-[#c7a653]/35 bg-[#111d19]"
      } ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
        {place}
      </p>
      {isPremium ? (
        <div className="mt-2">
          <p className="formidable-gold-text text-4xl font-black leading-none">
            {mainPrize}
          </p>
          {extras.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {extras.map((extra) => (
                <span
                  className="formidable-prize-chip rounded-full border px-3 py-1 text-sm font-black text-[#fff4d7]"
                  key={extra}
                >
                  {premiumPrizeChipLabel(extra)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p
          className={`mt-2 break-words font-black leading-tight text-[#fff4d7] ${
            compact ? "text-2xl xl:text-3xl" : "text-4xl"
          }`}
        >
          {prize}
        </p>
      )}
      {note ? (
        <p
          className={`mt-2 text-base leading-7 ${
            isPremium ? "text-[#bfb7a0]" : "text-[#b8c0ae]"
          }`}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
