"use client";

import { forwardRef, useMemo, useRef, useState } from "react";
import type {
  KnockoutDraw,
  KnockoutMatch,
  KnockoutRound,
  KnockoutTeam,
} from "@/data/knockout";

const slotClassNames = {
  1: "row-start-1",
  2: "row-start-2",
  3: "row-start-3",
  4: "row-start-4",
  5: "row-start-5",
  6: "row-start-6",
  7: "row-start-7",
} as const;

type Slot = keyof typeof slotClassNames;

type MobilePanel = {
  id: string;
  matches: KnockoutMatch[];
  prominent?: boolean;
  title: string;
};

const leftRoundSlots: Record<string, Slot[]> = {
  "left-round-of-32": [1, 3, 5, 7],
  "left-round-of-16": [2, 6],
  "left-quarter-finals": [4],
  "left-semi-finals": [4],
};

const rightRoundSlots: Record<string, Slot[]> = {
  "right-semi-finals": [4],
  "right-quarter-finals": [4],
  "right-round-of-16": [2, 6],
  "right-round-of-32": [1, 3, 5, 7],
};

const connectorSlotsByStage = {
  early: [2, 6],
  middle: [4],
  late: [4],
} as const;

function TeamLine({ team }: { team: KnockoutTeam }) {
  const stateLabel =
    team.state === "winner"
      ? "Winner"
      : team.state === "eliminated"
        ? "Eliminated"
        : "Pending";

  return (
    <div
      className={`rounded-md border px-3 py-3 ${
        team.state === "winner"
          ? "border-[#70b36f]/45 bg-[#14351f]"
          : team.state === "eliminated"
            ? "border-[#8f6355]/35 bg-[#241715]"
            : "border-[#d7b85f]/15 bg-[#0e1915]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden={team.flag === "◇"}
          aria-label={team.flag === "◇" ? undefined : `${team.label} flag`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#c7a653]/25 bg-[#172820] text-2xl text-[#f0d88b]"
          role={team.flag === "◇" ? undefined : "img"}
        >
          {team.flag}
        </span>
        <div className="min-w-0 flex-1">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="min-w-0 truncate text-base font-black text-[#fff4d7]">
              {team.label}
            </p>
            <span className="shrink-0 rounded-full border border-[#c7a653]/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#c7a653]">
              {stateLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-[#b8c0ae]">
            {team.owner}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  mobile = false,
  prominent = false,
}: {
  match: KnockoutMatch;
  mobile?: boolean;
  prominent?: boolean;
}) {
  return (
    <article
      className={`relative rounded-lg border shadow-[0_16px_38px_rgba(0,0,0,0.2)] ${
        prominent
          ? "border-[#d7b85f]/75 bg-[#1d2318] p-5"
          : `border-[#c7a653]/25 bg-[#111d19] ${mobile ? "p-4" : "p-3"}`
      }`}
      data-match-card="true"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-[#c7a653]">
            {match.label}
          </p>
          <p className="mt-1 truncate text-xs font-bold text-[#b8c0ae]">
            {match.dateTimeLabel}
          </p>
        </div>
        <span className="rounded-md border border-[#d7b85f]/25 bg-[#251f12] px-2 py-1 text-xs font-black uppercase tracking-wide text-[#f0d88b]">
          {match.scoreLabel}
        </span>
      </div>

      <div className={`mt-3 grid ${prominent ? "gap-3" : "gap-2"}`}>
        <TeamLine team={match.home} />
        <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#7f8a79]">
          v
        </div>
        <TeamLine team={match.away} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <span className="truncate rounded-md border border-[#70b36f]/25 bg-[#112617] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#bff2a5]">
          {match.winnerLabel}
        </span>
        <span className="truncate rounded-md border border-[#8f6355]/25 bg-[#201817] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#caa79b]">
          {match.eliminatedLabel}
        </span>
      </div>
    </article>
  );
}

function RoundHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 rounded-lg border border-[#c7a653]/25 bg-[#16241f] px-3 py-3">
      <p className="text-center text-sm font-black uppercase tracking-[0.18em] text-[#f0d88b]">
        {children}
      </p>
    </div>
  );
}

function DesktopRoundColumn({
  round,
  slots,
}: {
  round: KnockoutRound;
  slots: Slot[];
}) {
  return (
    <div className="grid w-[286px] grid-rows-[auto_1fr] gap-4">
      <RoundHeader>{round.name}</RoundHeader>
      <div className="grid grid-rows-8 gap-y-8">
        {round.matches.map((match, index) => (
          <div
            className={`${slotClassNames[slots[index] ?? 1]} row-span-2 self-center`}
            key={match.id}
          >
            <MatchCard match={match} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopConnectorColumn({
  slots,
}: {
  slots: readonly Slot[];
}) {
  return (
    <div aria-hidden="true" className="grid w-12 grid-rows-[auto_1fr] gap-4">
      <div className="h-[46px]" />
      <div className="grid grid-rows-8 gap-y-8">
        {slots.map((slot, index) => (
          <div
            className={`${slotClassNames[slot]} row-span-2 flex items-center`}
            key={`${slot}-${index}`}
          >
            <div
              className="h-px w-full bg-[#c7a653]/35"
              data-connector-line="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopCentreColumn({
  final,
  thirdPlace,
}: {
  final: KnockoutMatch;
  thirdPlace?: KnockoutMatch;
}) {
  return (
    <div className="grid w-[440px] grid-rows-[auto_1fr] gap-4">
      <div className="rounded-lg border border-[#d7b85f]/70 bg-[#251f12] px-3 py-4">
        <p className="text-center text-base font-black uppercase tracking-[0.2em] text-[#f0d88b]">
          Final
        </p>
      </div>
      <div className="grid grid-rows-8 gap-y-8">
        <div className="row-start-3 row-span-3 self-center">
          <MatchCard match={final} prominent />
        </div>
        {thirdPlace ? (
          <div className="row-start-7 row-span-2 self-start rounded-lg border border-dashed border-[#c7a653]/35 bg-[#0e1915] p-3">
            <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
              Optional third-place match
            </p>
            <MatchCard match={thirdPlace} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const MobileRoundPanel = forwardRef<
  HTMLDivElement,
  {
  indicator: string;
  matches: KnockoutMatch[];
  prominent?: boolean;
  title: string;
  }
>(function MobileRoundPanel(
  { indicator, matches, title, prominent = false },
  ref,
) {
  return (
    <div
      className="w-full shrink-0 snap-start rounded-lg border border-[#c7a653]/25 bg-[#0b1512] p-3"
      ref={ref}
    >
      <div className="sticky top-0 z-10 rounded-lg border border-[#c7a653]/25 bg-[#16241f] px-3 py-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
          {indicator}
        </p>
        <p className="mt-1 text-xl font-black text-[#f0d88b]">{title}</p>
      </div>
      <div className="mt-4 grid gap-4">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            mobile
            prominent={prominent}
          />
        ))}
      </div>
    </div>
  );
});

export function KnockoutWallChart({ draw }: { draw: KnockoutDraw }) {
  const desktopScrollerRef = useRef<HTMLDivElement>(null);
  const mobileScrollerRef = useRef<HTMLDivElement>(null);
  const mobilePanelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [mobilePanelIndex, setMobilePanelIndex] = useState(0);
  const scrollAmount = 350;

  const mobilePanels = useMemo<MobilePanel[]>(
    () => [
      {
        id: "mobile-round-of-32",
        matches: [...draw.leftRounds[0].matches, ...draw.rightRounds[3].matches],
        title: "Round of 32",
      },
      {
        id: "mobile-round-of-16",
        matches: [...draw.leftRounds[1].matches, ...draw.rightRounds[2].matches],
        title: "Round of 16",
      },
      {
        id: "mobile-quarter-finals",
        matches: [...draw.leftRounds[2].matches, ...draw.rightRounds[1].matches],
        title: "Quarter-finals",
      },
      {
        id: "mobile-semi-finals",
        matches: [...draw.leftRounds[3].matches, ...draw.rightRounds[0].matches],
        title: "Semi-finals",
      },
      {
        id: "final",
        matches: [draw.final],
        prominent: true,
        title: "Final",
      },
      ...(draw.thirdPlace
        ? [
            {
              id: "third-place",
              matches: [draw.thirdPlace],
              title: "Third-place match",
            },
          ]
        : []),
    ],
    [draw],
  );

  function scrollBracket(direction: "previous" | "next") {
    const mobileScroller = mobileScrollerRef.current;

    if (mobileScroller && getComputedStyle(mobileScroller).display !== "none") {
      const nextIndex =
        direction === "next"
          ? Math.min(mobilePanels.length - 1, mobilePanelIndex + 1)
          : Math.max(0, mobilePanelIndex - 1);

      setMobilePanelIndex(nextIndex);
      mobilePanelRefs.current[nextIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
      return;
    }

    const left = direction === "next" ? scrollAmount : -scrollAmount;
    desktopScrollerRef.current?.scrollBy({ behavior: "smooth", left });
  }

  return (
    <section
      aria-labelledby="knockout-heading"
      className="scroll-mt-24 rounded-lg border border-[#c7a653]/30 bg-[#111d19] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)] sm:p-5"
      id="knockout"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
            Preview — live tournament data will be added later
          </p>
          <h2
            className="mt-2 text-3xl font-black text-[#fff4d7]"
            id="knockout-heading"
          >
            Knockout wall chart
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-[#b8c0ae]">
            This mirrored sample bracket flows inward from both sides. It will
            populate automatically once the tournament reaches the knockout
            stage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-11 rounded-lg border border-[#c7a653]/35 bg-[#171f18] px-4 py-2 text-sm font-black uppercase tracking-wide text-[#f0d88b] transition hover:border-[#d7b85f] hover:bg-[#1d2d25]"
            onClick={() => scrollBracket("previous")}
            type="button"
          >
            Previous round
          </button>
          <button
            className="min-h-11 rounded-lg border border-[#c7a653]/35 bg-[#171f18] px-4 py-2 text-sm font-black uppercase tracking-wide text-[#f0d88b] transition hover:border-[#d7b85f] hover:bg-[#1d2d25]"
            onClick={() => scrollBracket("next")}
            type="button"
          >
            Next round
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs font-black uppercase tracking-wide text-[#d9dccf]">
        {[
          "Round of 32",
          "Round of 16",
          "Quarter-finals",
          "Semi-finals",
          "Final",
          "Third place",
          "Semi-finals",
          "Quarter-finals",
          "Round of 16",
          "Round of 32",
        ].map((round, index) => (
          <span
            className="shrink-0 rounded-full border border-[#c7a653]/25 bg-[#0e1915] px-3 py-2"
            key={`${round}-${index}`}
          >
            {round}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[#c7a653]/20 bg-[#0b1512] p-3">
        <div
          aria-label="Scrollable mirrored knockout bracket"
          className="hidden overflow-x-auto scroll-smooth pb-2 lg:block"
          ref={desktopScrollerRef}
          tabIndex={0}
        >
          <div className="grid min-w-[3328px] grid-cols-[286px_48px_286px_48px_286px_48px_286px_64px_440px_64px_286px_48px_286px_48px_286px_48px_286px] gap-x-4">
            <DesktopRoundColumn
              round={draw.leftRounds[0]}
              slots={leftRoundSlots[draw.leftRounds[0].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.early} />
            <DesktopRoundColumn
              round={draw.leftRounds[1]}
              slots={leftRoundSlots[draw.leftRounds[1].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.middle} />
            <DesktopRoundColumn
              round={draw.leftRounds[2]}
              slots={leftRoundSlots[draw.leftRounds[2].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.late} />
            <DesktopRoundColumn
              round={draw.leftRounds[3]}
              slots={leftRoundSlots[draw.leftRounds[3].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.late} />
            <DesktopCentreColumn
              final={draw.final}
              thirdPlace={draw.thirdPlace}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.late} />
            <DesktopRoundColumn
              round={draw.rightRounds[0]}
              slots={rightRoundSlots[draw.rightRounds[0].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.late} />
            <DesktopRoundColumn
              round={draw.rightRounds[1]}
              slots={rightRoundSlots[draw.rightRounds[1].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.middle} />
            <DesktopRoundColumn
              round={draw.rightRounds[2]}
              slots={rightRoundSlots[draw.rightRounds[2].id]}
            />
            <DesktopConnectorColumn slots={connectorSlotsByStage.early} />
            <DesktopRoundColumn
              round={draw.rightRounds[3]}
              slots={rightRoundSlots[draw.rightRounds[3].id]}
            />
          </div>
        </div>

        <div
          aria-label="Mobile knockout round carousel"
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 lg:hidden"
          onScroll={(event) => {
            const scroller = event.currentTarget;
            const panelWidth = scroller.clientWidth;

            if (panelWidth > 0) {
              setMobilePanelIndex(
                Math.round(scroller.scrollLeft / (panelWidth + 16)),
              );
            }
          }}
          ref={mobileScrollerRef}
          tabIndex={0}
        >
          {mobilePanels.map((panel, index) => (
            <MobileRoundPanel
              indicator={`Round ${index + 1} of ${mobilePanels.length}`}
              key={panel.id}
              matches={panel.matches}
              prominent={panel.prominent}
              ref={(element) => {
                mobilePanelRefs.current[index] = element;
              }}
              title={panel.title}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="rounded-lg border border-dashed border-[#c7a653]/35 bg-[#0e1915] p-4 text-base font-bold leading-7 text-[#d9dccf]">
          Empty state: no real knockout fixtures are available yet. The bracket
          will populate automatically once the tournament reaches the knockout
          stage.
        </div>
        <p className="rounded-lg border border-[#d7b85f]/25 bg-[#171f18] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#f0d88b]">
          Swipe or drag sideways on mobile
        </p>
      </div>
    </section>
  );
}
