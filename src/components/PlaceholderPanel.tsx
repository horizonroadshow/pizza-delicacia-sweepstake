type PlaceholderPanelProps = {
  children?: React.ReactNode;
  description?: string;
  title: string;
  variant?: "default" | "glass" | "premium";
};

export function PlaceholderPanel({
  children,
  description,
  title,
  variant = "default",
}: PlaceholderPanelProps) {
  const isPremium = variant === "premium";
  const isGlass = variant === "glass";

  return (
    <section
      className={`rounded-lg border shadow-[0_18px_45px_rgba(0,0,0,0.2)] ${
        isPremium
          ? "formidable-metal-card p-4"
          : isGlass
            ? "apple-glass-panel p-4"
          : "border-[#c7a653]/30 bg-[#111d19] p-5"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
        Preview
      </p>
      <h2
        className={`mt-2 text-2xl font-black ${
          isPremium
            ? "formidable-gold-text"
            : isGlass
              ? "apple-glass-heading"
              : "text-[#fff4d7]"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-base leading-7 text-[#b8c0ae]">
          {description}
        </p>
      ) : null}
      {children ? (
        <div className={isPremium || isGlass ? "mt-3" : "mt-4"}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
