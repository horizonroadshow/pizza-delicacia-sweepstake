type PlaceholderPanelProps = {
  children?: React.ReactNode;
  description: string;
  title: string;
};

export function PlaceholderPanel({
  children,
  description,
  title,
}: PlaceholderPanelProps) {
  return (
    <section className="rounded-lg border border-[#c7a653]/30 bg-[#111d19] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
        Preview
      </p>
      <h2 className="mt-2 text-2xl font-black text-[#fff4d7]">{title}</h2>
      <p className="mt-2 max-w-3xl text-base leading-7 text-[#b8c0ae]">
        {description}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
