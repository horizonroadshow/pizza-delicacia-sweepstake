"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type {
  KnockoutDraw,
  KnockoutMatch,
  KnockoutRound,
  KnockoutTeam,
} from "@/data/knockout";

type MobilePanel = {
  id: string;
  matches: KnockoutMatch[];
  prominent?: boolean;
  stageId: KnockoutDraw["currentRoundId"];
  title: string;
};

type MobileRoundColumnData = MobilePanel & {
  connectorSlots?: number[];
  matchSlots: number[];
};

const desktopRoundCardSlots: Record<string, number[]> = {
  "round-of-32": [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31],
  "round-of-16": [2, 6, 10, 14, 18, 22, 26, 30],
  "quarter-finals": [4, 12, 20, 28],
  "semi-finals": [8, 24],
};

const desktopBracketRowCount = 32;
const defaultDesktopBracketRowHeight = 180;
const compactDesktopBracketRowHeight = 132;

function desktopSlotCentre(slot: number, rowHeight: number) {
  return slot * rowHeight;
}

type DesktopConnection = {
  fromSlots: number[];
  sourceIds: string[];
  targetId: string;
  toSlot: number;
};

type DesktopProgression = {
  connectionsByTargetRound: Map<string, DesktopConnection[]>;
  finalConnections: DesktopConnection[];
  finalSlot: number;
  slotsByMatchId: Map<string, number>;
  validationMessages: string[];
};

function averageSlot(slots: number[]) {
  return slots.reduce((total, slot) => total + slot, 0) / slots.length;
}

function roundedSlot(slot: number) {
  return Math.max(1, Math.min(desktopBracketRowCount - 1, Math.round(slot)));
}

function buildDesktopProgression(
  rounds: KnockoutRound[],
  final: KnockoutMatch,
): DesktopProgression {
  const slotsByMatchId = new Map<string, number>();
  const sourcesByTargetId = new Map<string, KnockoutMatch[]>();
  const roundByMatchId = new Map<string, string>();
  const validationMessages: string[] = [];

  for (const round of rounds) {
    for (const match of round.matches) {
      roundByMatchId.set(match.id, round.id);

      if (match.nextMatchId) {
        const sources = sourcesByTargetId.get(match.nextMatchId) ?? [];
        sources.push(match);
        sourcesByTargetId.set(match.nextMatchId, sources);
      }
    }
  }

  roundByMatchId.set(final.id, "final");

  for (const round of rounds) {
    const fallbackSlots = desktopRoundCardSlots[round.id] ?? [];

    for (const [index, match] of round.matches.entries()) {
      const sourceSlots =
        sourcesByTargetId
          .get(match.id)
          ?.map((source) => slotsByMatchId.get(source.id))
          .filter((slot): slot is number => typeof slot === "number") ?? [];

      slotsByMatchId.set(
        match.id,
        sourceSlots.length >= 2
          ? roundedSlot(averageSlot(sourceSlots))
          : (fallbackSlots[index] ?? 1),
      );
    }
  }

  const finalSourceSlots =
    sourcesByTargetId
      .get(final.id)
      ?.map((source) => slotsByMatchId.get(source.id))
      .filter((slot): slot is number => typeof slot === "number") ?? [];
  const finalSlot =
    finalSourceSlots.length >= 2 ? roundedSlot(averageSlot(finalSourceSlots)) : 16;

  slotsByMatchId.set(final.id, finalSlot);

  const connectionForTarget = (target: KnockoutMatch): DesktopConnection | null => {
    const sources = sourcesByTargetId.get(target.id) ?? [];
    const sourcesWithSlots = sources
      .map((source) => ({
        id: source.id,
        slot: slotsByMatchId.get(source.id),
      }))
      .filter(
        (source): source is { id: string; slot: number } =>
          typeof source.slot === "number",
      )
      .sort((a, b) => a.slot - b.slot);
    const toSlot = slotsByMatchId.get(target.id);

    if (
      sources.length < 2 ||
      sourcesWithSlots.length < 2 ||
      typeof toSlot !== "number"
    ) {
      return null;
    }

    return {
      fromSlots: sourcesWithSlots.map((source) => source.slot),
      sourceIds: sourcesWithSlots.map((source) => source.id),
      targetId: target.id,
      toSlot,
    };
  };

  const connectionsByTargetRound = new Map<string, DesktopConnection[]>();

  for (const round of rounds.slice(1)) {
    connectionsByTargetRound.set(
      round.id,
      round.matches
        .map((match) => connectionForTarget(match))
        .filter((connection): connection is DesktopConnection => Boolean(connection)),
    );
  }

  const finalConnection = connectionForTarget(final);
  const expectedTargetCounts = new Map([
    ["round-of-16", 8],
    ["quarter-finals", 4],
    ["semi-finals", 2],
    ["final", 1],
  ]);

  for (const [targetRoundId, expectedTargetCount] of expectedTargetCounts) {
    const targets =
      targetRoundId === "final"
        ? [final]
        : (rounds.find((round) => round.id === targetRoundId)?.matches ?? []);
    const linkedTargets = targets.filter(
      (target) => (sourcesByTargetId.get(target.id) ?? []).length === 2,
    );

    if (targets.length !== expectedTargetCount) {
      validationMessages.push(
        `${targetRoundId} has ${targets.length} matches, expected ${expectedTargetCount}.`,
      );
    }

    if (linkedTargets.length !== targets.length) {
      validationMessages.push(
        `${targetRoundId} has ${linkedTargets.length} fully linked targets out of ${targets.length}.`,
      );
    }
  }

  for (const round of rounds.slice(0, -1)) {
    for (const match of round.matches) {
      const targetRound = match.nextMatchId
        ? roundByMatchId.get(match.nextMatchId)
        : undefined;

      if (!targetRound) {
        validationMessages.push(`${match.id} does not feed a later match.`);
      }
    }
  }

  return {
    connectionsByTargetRound,
    finalConnections: finalConnection ? [finalConnection] : [],
    finalSlot,
    slotsByMatchId,
    validationMessages,
  };
}

function TeamLine({
  compactDesktop = false,
  team,
}: {
  compactDesktop?: boolean;
  team: KnockoutTeam;
}) {
  const stateLabel =
    team.state === "winner"
      ? "Winner"
      : team.state === "eliminated"
        ? "Eliminated"
        : "Pending";

  return (
    <div
      className={`rounded-md border ${
        compactDesktop ? "px-2 py-2" : "px-3 py-3"
      } ${
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
          className={`flex shrink-0 items-center justify-center rounded-md border border-[#c7a653]/25 bg-[#172820] text-[#f0d88b] ${
            compactDesktop ? "h-9 w-9 text-xl" : "h-11 w-11 text-2xl"
          }`}
          role={team.flag === "◇" ? undefined : "img"}
        >
          {team.flag}
        </span>
        <div className="min-w-0 flex-1">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p
              className={`min-w-0 truncate font-black text-[#fff4d7] ${
                compactDesktop ? "text-sm" : "text-base"
              }`}
            >
              {team.label}
            </p>
            <span className="shrink-0 rounded-full border border-[#c7a653]/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#c7a653]">
              {stateLabel}
            </span>
          </div>
          <p
            className={`mt-0.5 truncate font-semibold text-[#b8c0ae] ${
              compactDesktop ? "text-xs" : "text-sm"
            }`}
          >
            {team.owner}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  compactDesktop = false,
  match,
  mobile = false,
  prominent = false,
}: {
  compactDesktop?: boolean;
  match: KnockoutMatch;
  mobile?: boolean;
  prominent?: boolean;
}) {
  return (
    <article
      className={`relative rounded-lg border shadow-[0_16px_38px_rgba(0,0,0,0.2)] ${
        prominent
          ? `border-[#d7b85f]/75 bg-[#1d2318] ${
              compactDesktop ? "p-3" : "p-5"
            }`
          : `border-[#c7a653]/25 bg-[#111d19] ${
              compactDesktop ? "p-2.5" : mobile ? "p-4" : "p-3"
            }`
      }`}
      data-match-card="true"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p
            className={`truncate font-black uppercase tracking-[0.16em] text-[#c7a653] ${
              compactDesktop ? "text-[10px]" : "text-xs"
            }`}
          >
            {match.label}
          </p>
          <p
            className={`mt-1 truncate font-bold text-[#b8c0ae] ${
              compactDesktop ? "text-[10px]" : "text-xs"
            }`}
          >
            {match.dateTimeLabel}
          </p>
        </div>
        <span
          className={`rounded-md border border-[#d7b85f]/25 bg-[#251f12] font-black uppercase tracking-wide text-[#f0d88b] ${
            compactDesktop ? "px-1.5 py-1 text-[10px]" : "px-2 py-1 text-xs"
          }`}
        >
          {match.scoreLabel}
        </span>
      </div>

      <div
        className={`${compactDesktop ? "mt-2" : "mt-3"} grid ${
          compactDesktop ? "gap-1.5" : prominent ? "gap-3" : "gap-2"
        }`}
      >
        <TeamLine compactDesktop={compactDesktop} team={match.home} />
        <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#7f8a79]">
          v
        </div>
        <TeamLine compactDesktop={compactDesktop} team={match.away} />
      </div>

      <div
        className={`${compactDesktop ? "mt-2 gap-1.5" : "mt-3 gap-2"} grid sm:grid-cols-2`}
      >
        <span
          className={`truncate rounded-md border border-[#70b36f]/25 bg-[#112617] font-black uppercase tracking-wide text-[#bff2a5] ${
            compactDesktop ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
          }`}
        >
          {match.winnerLabel}
        </span>
        <span
          className={`truncate rounded-md border border-[#8f6355]/25 bg-[#201817] font-black uppercase tracking-wide text-[#caa79b] ${
            compactDesktop ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
          }`}
        >
          {match.statusLabel}
        </span>
      </div>
    </article>
  );
}

function RoundHeader({
  children,
  compactDesktop = false,
  isCurrent = false,
}: {
  children: React.ReactNode;
  compactDesktop?: boolean;
  isCurrent?: boolean;
}) {
  return (
    <div
      aria-current={isCurrent ? "step" : undefined}
      className={`sticky top-0 z-10 rounded-lg border ${
        compactDesktop ? "px-2 py-2" : "px-3 py-3"
      } ${
        isCurrent
          ? "border-[#d7b85f]/80 bg-[#251f12] shadow-[0_0_0_1px_rgba(215,184,95,0.22),0_16px_34px_rgba(0,0,0,0.2)]"
          : "border-[#c7a653]/25 bg-[#16241f]"
      }`}
      data-current-round={isCurrent ? "true" : undefined}
    >
      <p
        className={`text-center font-black uppercase tracking-[0.18em] text-[#f0d88b] ${
          compactDesktop ? "text-xs" : "text-sm"
        }`}
      >
        {children}
      </p>
      {isCurrent ? (
        <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.18em] text-[#d7b85f]">
          Current round
        </p>
      ) : null}
    </div>
  );
}

function DesktopRoundColumn({
  compactDesktop = false,
  isCurrent = false,
  round,
  rowHeight,
  slotsByMatchId,
}: {
  compactDesktop?: boolean;
  isCurrent?: boolean;
  round: KnockoutRound;
  rowHeight: number;
  slotsByMatchId: Map<string, number>;
}) {
  return (
    <div
      className={`grid shrink-0 grid-rows-[auto_1fr] ${
        compactDesktop ? "w-[268px] gap-2" : "w-[320px] gap-4"
      }`}
      data-desktop-round-column="true"
      data-round-id={round.id}
    >
      <RoundHeader compactDesktop={compactDesktop} isCurrent={isCurrent}>
        {round.name}
      </RoundHeader>
      <div
        className="grid"
        style={{
          gridTemplateRows: `repeat(${desktopBracketRowCount}, ${rowHeight}px)`,
        }}
      >
        {round.matches.map((match, index) => (
          <div
            className="row-span-2 self-center"
            data-match-id={match.id}
            key={match.id}
            style={{
              gridRowStart:
                slotsByMatchId.get(match.id) ??
                desktopRoundCardSlots[round.id]?.[index] ??
                1,
            }}
          >
            <MatchCard compactDesktop={compactDesktop} match={match} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopConnectorColumn({
  compactDesktop = false,
  connections,
  rowHeight,
}: {
  compactDesktop?: boolean;
  connections: DesktopConnection[];
  rowHeight: number;
}) {
  const desktopBracketHeight = desktopBracketRowCount * rowHeight;

  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 grid-rows-[auto_1fr] ${
        compactDesktop ? "w-12 gap-2" : "w-20 gap-4"
      }`}
      data-desktop-connector-column="true"
    >
      <div className={compactDesktop ? "h-[38px]" : "h-[46px]"} />
      <div
        className="relative"
        style={{ height: desktopBracketHeight }}
      >
        {connections.map((connection) => {
          const [firstSourceSlot, secondSourceSlot] = connection.fromSlots;
          const firstSourceCentre = desktopSlotCentre(firstSourceSlot, rowHeight);
          const secondSourceCentre = desktopSlotCentre(
            secondSourceSlot,
            rowHeight,
          );
          const targetCentre = desktopSlotCentre(connection.toSlot, rowHeight);
          const top = Math.min(firstSourceCentre, secondSourceCentre);
          const height = Math.abs(secondSourceCentre - firstSourceCentre);

          return (
            <div
              className="absolute inset-x-0"
              data-desktop-connector-line="true"
              data-source-ids={connection.sourceIds.join(",")}
              data-target-id={connection.targetId}
              key={`${connection.sourceIds.join("-")}-${connection.targetId}`}
              style={{
                height,
                top,
              }}
            >
              <span className="absolute left-0 top-0 h-px w-1/2 bg-[#c7a653]/45" />
              <span className="absolute bottom-0 left-0 h-px w-1/2 bg-[#c7a653]/45" />
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#c7a653]/50" />
              <span
                className="absolute left-1/2 h-px w-1/2 bg-[#d7b85f]/65"
                style={{ top: targetCentre - top }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DesktopCentreColumn({
  compactDesktop = false,
  final,
  finalConnections,
  finalSlot,
  currentRoundId,
  rowHeight,
  thirdPlace,
}: {
  compactDesktop?: boolean;
  currentRoundId: KnockoutDraw["currentRoundId"];
  final: KnockoutMatch;
  finalConnections: DesktopConnection[];
  finalSlot: number;
  rowHeight: number;
  thirdPlace?: KnockoutMatch;
}) {
  const isFinalCurrent = currentRoundId === "final";
  const isThirdPlaceCurrent = currentRoundId === "third-place";

  return (
    <div
      className={`flex shrink-0 ${compactDesktop ? "gap-2" : "gap-4"}`}
      data-desktop-final-group="true"
    >
      <DesktopConnectorColumn
        compactDesktop={compactDesktop}
        connections={finalConnections}
        rowHeight={rowHeight}
      />
      <div
        className={`grid shrink-0 grid-rows-[auto_1fr] ${
          compactDesktop ? "w-[360px] gap-2" : "w-[440px] gap-4"
        }`}
        data-desktop-round-column="true"
        data-round-id="finals"
      >
        <div
          aria-current={isFinalCurrent ? "step" : undefined}
          className={`rounded-lg border ${
            compactDesktop ? "px-2 py-2.5" : "px-3 py-4"
          } ${
            isFinalCurrent
              ? "border-[#d7b85f] bg-[#2b2415] shadow-[0_0_0_1px_rgba(215,184,95,0.25),0_18px_38px_rgba(0,0,0,0.22)]"
              : "border-[#d7b85f]/70 bg-[#251f12]"
          }`}
          data-current-round={isFinalCurrent ? "true" : undefined}
        >
          <p
            className={`text-center font-black uppercase tracking-[0.2em] text-[#f0d88b] ${
              compactDesktop ? "text-sm" : "text-base"
            }`}
          >
            Final
          </p>
          {isFinalCurrent ? (
            <p className="mt-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#d7b85f]">
              Current round
            </p>
          ) : null}
        </div>
        <div
          className="grid"
          style={{
            gridTemplateRows: `repeat(${desktopBracketRowCount}, ${rowHeight}px)`,
          }}
        >
          <div
            className="row-span-3 self-center"
            data-match-id={final.id}
            data-round-id="final"
            style={{ gridRowStart: finalSlot }}
          >
            <MatchCard compactDesktop={compactDesktop} match={final} prominent />
          </div>
          {thirdPlace ? (
            <div
              aria-current={isThirdPlaceCurrent ? "step" : undefined}
              className={`row-span-3 self-start rounded-lg border border-dashed ${
                compactDesktop ? "p-2" : "p-3"
              } ${
                isThirdPlaceCurrent
                  ? "border-[#d7b85f]/75 bg-[#251f12]"
                  : "border-[#c7a653]/35 bg-[#0e1915]"
              }`}
              data-current-round={isThirdPlaceCurrent ? "true" : undefined}
              data-round-id="third-place"
              style={{ gridRowStart: 24 }}
            >
              <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
                Optional third-place match
              </p>
              <MatchCard compactDesktop={compactDesktop} match={thirdPlace} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const mobileRoundCardSlots: Record<string, number[]> = {
  "mobile-round-of-32": [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31],
  "mobile-round-of-16": [2, 6, 10, 14, 18, 22, 26, 30],
  "mobile-quarter-finals": [4, 12, 20, 28],
  "mobile-semi-finals": [8, 24],
  final: [16],
  "third-place": [24],
};

const mobileConnectorSlots: Record<string, number[]> = {
  "mobile-round-of-32": [2, 6, 10, 14, 18, 22, 26, 30],
  "mobile-round-of-16": [4, 12, 20, 28],
  "mobile-quarter-finals": [8, 24],
  "mobile-semi-finals": [16],
  final: [24],
};

function mobilePanelIndexForRound(
  roundId: KnockoutDraw["currentRoundId"],
  hasThirdPlace: boolean,
) {
  const mobileRoundOrder: KnockoutDraw["currentRoundId"][] = [
    "round-of-32",
    "round-of-16",
    "quarter-finals",
    "semi-finals",
    "final",
    ...(hasThirdPlace ? (["third-place"] as const) : []),
  ];
  const index = mobileRoundOrder.indexOf(roundId);

  return index === -1 ? 0 : index;
}

function roundById(draw: KnockoutDraw, roundId: string) {
  const round = draw.rounds.find((item) => item.id === roundId);

  if (!round) {
    throw new Error(`Missing knockout round: ${roundId}`);
  }

  return round;
}

const MobileRoundColumn = forwardRef<
  HTMLDivElement,
  {
  column: MobileRoundColumnData;
  indicator: string;
  isCurrent?: boolean;
  }
>(function MobileRoundColumn(
  { column, indicator, isCurrent = false },
  ref,
) {
  return (
    <div
      aria-current={isCurrent ? "step" : undefined}
      className={`w-[292px] shrink-0 snap-start rounded-lg border bg-[#0b1512] p-3 ${
        isCurrent
          ? "border-[#d7b85f]/85 shadow-[0_0_0_1px_rgba(215,184,95,0.18),0_18px_42px_rgba(0,0,0,0.28)]"
          : "border-[#c7a653]/25"
      }`}
      data-current-round={isCurrent ? "true" : undefined}
      data-mobile-round-column="true"
      ref={ref}
    >
      <div
        className={`sticky top-0 z-10 rounded-lg border px-3 py-3 ${
          isCurrent
            ? "border-[#d7b85f]/75 bg-[#251f12]"
            : "border-[#c7a653]/25 bg-[#16241f]"
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
          {indicator}
        </p>
        <p className="mt-1 text-xl font-black text-[#f0d88b]">{column.title}</p>
        {isCurrent ? (
          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[#d7b85f]">
            Current round
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid min-h-[3080px] grid-rows-[repeat(32,minmax(0,1fr))] gap-y-5">
        {column.matches.map((match, index) => (
          <div
            className="row-span-2 self-center"
            key={match.id}
            style={{ gridRowStart: column.matchSlots[index] ?? 1 }}
          >
            <MatchCard match={match} mobile prominent={column.prominent} />
          </div>
        ))}
      </div>
    </div>
  );
});

function MobileConnectorColumn({ slots }: { slots: number[] }) {
  return (
    <div
      aria-hidden="true"
      className="grid w-20 shrink-0 grid-rows-[72px_1fr] gap-4"
      data-mobile-connector-column="true"
    >
      <div />
      <div className="grid min-h-[3080px] grid-rows-[repeat(32,minmax(0,1fr))] gap-y-5">
        {slots.map((slot, index) => (
          <div
            className="row-span-2 flex items-center"
            key={`${slot}-${index}`}
            style={{ gridRowStart: slot }}
          >
            <div
              className="h-px w-full bg-[#c7a653]/35"
              data-mobile-connector-line="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KnockoutWallChart({
  compactDesktop = false,
  draw,
  variant = "default",
}: {
  compactDesktop?: boolean;
  draw: KnockoutDraw;
  variant?: "default" | "glass";
}) {
  const isGlass = variant === "glass";
  const desktopScrollerRef = useRef<HTMLDivElement>(null);
  const mobileScrollerRef = useRef<HTMLDivElement>(null);
  const mobilePanelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [mobilePanelIndex, setMobilePanelIndex] = useState(() =>
    mobilePanelIndexForRound(draw.currentRoundId, Boolean(draw.thirdPlace)),
  );
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(max-width: 1023px)").matches,
  );
  const desktopRounds = draw.rounds;
  const desktopRowHeight = compactDesktop
    ? compactDesktopBracketRowHeight
    : defaultDesktopBracketRowHeight;
  const desktopProgression = useMemo(
    () => buildDesktopProgression(desktopRounds, draw.final),
    [desktopRounds, draw.final],
  );

  const mobilePanels = useMemo<MobileRoundColumnData[]>(() => {
    // Both desktop and mobile use draw.rounds as the complete source of truth.
    // The responsive layouts should differ only in presentation, never counts.
    const roundOf32 = roundById(draw, "round-of-32");
    const roundOf16 = roundById(draw, "round-of-16");
    const quarterFinals = roundById(draw, "quarter-finals");
    const semiFinals = roundById(draw, "semi-finals");
    const panels: MobilePanel[] = [
      {
        id: "mobile-round-of-32",
        matches: roundOf32.matches,
        stageId: "round-of-32",
        title: "Round of 32",
      },
      {
        id: "mobile-round-of-16",
        matches: roundOf16.matches,
        stageId: "round-of-16",
        title: "Round of 16",
      },
      {
        id: "mobile-quarter-finals",
        matches: quarterFinals.matches,
        stageId: "quarter-finals",
        title: "Quarter-finals",
      },
      {
        id: "mobile-semi-finals",
        matches: semiFinals.matches,
        stageId: "semi-finals",
        title: "Semi-finals",
      },
      {
        id: "final",
        matches: [draw.final],
        prominent: true,
        stageId: "final",
        title: "Final",
      },
      ...(draw.thirdPlace
        ? [
            {
              id: "third-place",
              matches: [draw.thirdPlace],
              stageId: "third-place" as const,
              title: "Third-place match",
            },
          ]
        : []),
    ];

    return panels.map((panel) => ({
      ...panel,
      connectorSlots: mobileConnectorSlots[panel.id],
      matchSlots: mobileRoundCardSlots[panel.id],
    }));
  }, [draw]);
  const selectedPanel =
    mobilePanels[mobilePanelIndex] ??
    mobilePanels[
      mobilePanelIndexForRound(draw.currentRoundId, Boolean(draw.thirdPlace))
    ];
  const activeToolbarStageId = isMobileLayout
    ? (selectedPanel?.stageId ?? draw.currentRoundId)
    : draw.currentRoundId;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateMobileLayout = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    mediaQuery.addEventListener("change", updateMobileLayout);

    return () => mediaQuery.removeEventListener("change", updateMobileLayout);
  }, []);

  useEffect(() => {
    const currentRoundIndex = mobilePanelIndexForRound(
      draw.currentRoundId,
      Boolean(draw.thirdPlace),
    );

    const animationFrame = requestAnimationFrame(() => {
      const mobileScroller = mobileScrollerRef.current;
      const currentPanel = mobilePanelRefs.current[currentRoundIndex];

      setMobilePanelIndex(currentRoundIndex);

      if (!mobileScroller || !currentPanel) {
        return;
      }

      mobileScroller.scrollTo({
        behavior: "auto",
        left: currentPanel.offsetLeft - mobileScroller.offsetLeft,
      });
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [draw.currentRoundId, draw.thirdPlace, mobilePanels]);

  function scrollDesktopToRound(stageId: KnockoutDraw["currentRoundId"]) {
    const desktopScroller = desktopScrollerRef.current;

    if (!desktopScroller) {
      return;
    }

    const targetRoundId =
      stageId === "final" || stageId === "third-place" ? "finals" : stageId;
    const targetColumn = desktopScroller.querySelector<HTMLElement>(
      `[data-round-id="${targetRoundId}"]`,
    );

    if (!targetColumn) {
      return;
    }

    desktopScroller.scrollTo({
      behavior: "smooth",
      left: targetColumn.offsetLeft - desktopScroller.offsetLeft,
    });
  }

  function selectMobilePanel(index: number) {
    const nextIndex = Math.max(0, Math.min(mobilePanels.length - 1, index));
    const nextPanel = mobilePanels[nextIndex];

    setMobilePanelIndex(nextIndex);

    const mobileScroller = mobileScrollerRef.current;

    if (mobileScroller && getComputedStyle(mobileScroller).display !== "none") {
      mobilePanelRefs.current[nextIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
      return;
    }

    if (nextPanel) {
      scrollDesktopToRound(nextPanel.stageId);
    }
  }

  function scrollBracket(direction: "previous" | "next") {
    selectMobilePanel(
      direction === "next" ? mobilePanelIndex + 1 : mobilePanelIndex - 1,
    );
  }

  return (
    <section
      aria-labelledby="knockout-heading"
      className={`scroll-mt-24 rounded-lg border border-[#c7a653]/30 bg-[#111d19] shadow-[0_22px_70px_rgba(0,0,0,0.24)] ${
        compactDesktop ? "p-3 sm:p-4" : "p-4 sm:p-5"
      } ${isGlass ? "apple-glass-panel" : ""}`}
      id="knockout"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
            OpenFootball World Cup 2026 data
          </p>
          <h2
            className="mt-2 text-3xl font-black text-[#fff4d7]"
            id="knockout-heading"
          >
            Knockout wall chart
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-11 rounded-lg border border-[#c7a653]/35 bg-[#171f18] px-4 py-2 text-sm font-black uppercase tracking-wide text-[#f0d88b] transition hover:border-[#d7b85f] hover:bg-[#1d2d25] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#c7a653]/35 disabled:hover:bg-[#171f18]"
            disabled={mobilePanelIndex === 0}
            onClick={() => scrollBracket("previous")}
            type="button"
          >
            Previous round
          </button>
          <button
            className="min-h-11 rounded-lg border border-[#c7a653]/35 bg-[#171f18] px-4 py-2 text-sm font-black uppercase tracking-wide text-[#f0d88b] transition hover:border-[#d7b85f] hover:bg-[#1d2d25] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#c7a653]/35 disabled:hover:bg-[#171f18]"
            disabled={mobilePanelIndex === mobilePanels.length - 1}
            onClick={() => scrollBracket("next")}
            type="button"
          >
            Next round
          </button>
        </div>
      </div>

      <div
        aria-label="Knockout rounds"
        className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs font-black uppercase tracking-wide text-[#d9dccf]"
        role="tablist"
      >
        {[
          ...draw.rounds.map((round) => ({
            label: round.name,
            stageId: round.id,
          })),
          { label: "Final", stageId: "final" },
          ...(draw.thirdPlace
            ? [{ label: "Third place", stageId: "third-place" }]
            : []),
        ].map((round, index) => {
          const isCurrent = round.stageId === activeToolbarStageId;

          return (
            <button
              aria-selected={isCurrent}
              className={`shrink-0 rounded-full border px-3 py-2 transition ${
                isCurrent
                  ? "border-[#d7b85f] bg-[#d7b85f] text-[#07110f]"
                  : "border-[#c7a653]/25 bg-[#0e1915] hover:border-[#d7b85f]/70 hover:bg-[#16241f]"
              }`}
              data-current-round={isCurrent ? "true" : undefined}
              key={`${round.label}-${index}`}
              onClick={() => selectMobilePanel(index)}
              role="tab"
              type="button"
            >
              {round.label}
            </button>
          );
        })}
      </div>

      <div
        className={`mt-5 rounded-lg border border-[#c7a653]/20 bg-[#0b1512] ${
          compactDesktop ? "p-2.5" : "p-3"
        } ${isGlass ? "apple-glass-bracket-frame" : ""}`}
      >
        <div
          aria-label="Scrollable complete knockout bracket"
          className="hidden overflow-x-auto scroll-smooth pb-2 lg:block"
          ref={desktopScrollerRef}
          tabIndex={0}
        >
          <div
            className={`flex items-start ${
              compactDesktop ? "min-w-[1680px] gap-2" : "min-w-[2072px] gap-4"
            }`}
          >
            {desktopRounds.map((round, index) => {
              const nextRound = desktopRounds[index + 1];
              const connections = nextRound
                ? (desktopProgression.connectionsByTargetRound.get(nextRound.id) ??
                  [])
                : [];

              return (
                <div
                  className={`flex shrink-0 ${
                    compactDesktop ? "gap-2" : "gap-4"
                  }`}
                  key={round.id}
                >
                  <DesktopRoundColumn
                    compactDesktop={compactDesktop}
                    isCurrent={draw.currentRoundId === round.id}
                    round={round}
                    rowHeight={desktopRowHeight}
                    slotsByMatchId={desktopProgression.slotsByMatchId}
                  />
                  {nextRound ? (
                    <DesktopConnectorColumn
                      compactDesktop={compactDesktop}
                      connections={connections}
                      rowHeight={desktopRowHeight}
                    />
                  ) : null}
                </div>
              );
            })}
            <DesktopCentreColumn
              compactDesktop={compactDesktop}
              currentRoundId={draw.currentRoundId}
              final={draw.final}
              finalConnections={desktopProgression.finalConnections}
              finalSlot={desktopProgression.finalSlot}
              rowHeight={desktopRowHeight}
              thirdPlace={draw.thirdPlace}
            />
          </div>
        </div>

        <div
          aria-label="Mobile knockout round carousel"
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 lg:hidden"
          onScroll={(event) => {
            const scroller = event.currentTarget;
            const nextIndex = mobilePanelRefs.current.reduce(
              (closestIndex, panel, index) => {
                if (!panel) {
                  return closestIndex;
                }

                const currentPanel = mobilePanelRefs.current[closestIndex];
                const currentDistance = currentPanel
                  ? Math.abs(scroller.scrollLeft - currentPanel.offsetLeft)
                  : Number.POSITIVE_INFINITY;
                const nextDistance = Math.abs(
                  scroller.scrollLeft - panel.offsetLeft,
                );

                return nextDistance < currentDistance ? index : closestIndex;
              },
              0,
            );

            setMobilePanelIndex(nextIndex);
          }}
          ref={mobileScrollerRef}
          tabIndex={0}
        >
          {mobilePanels.map((panel, index) => (
            <div className="flex shrink-0" key={panel.id}>
              <MobileRoundColumn
                column={panel}
                indicator={`Round ${index + 1} of ${mobilePanels.length}`}
                isCurrent={index === mobilePanelIndex}
                ref={(element) => {
                  mobilePanelRefs.current[index] = element;
                }}
              />
              {panel.connectorSlots && index < mobilePanels.length - 1 ? (
                <MobileConnectorColumn slots={panel.connectorSlots} />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="rounded-lg border border-dashed border-[#c7a653]/25 bg-[#0e1915] px-3 py-2 text-xs font-bold leading-5 text-[#858d7d]">
          Fixture and result data is provided by OpenFootball static data.
          Updates may lag official results.
        </div>
        <p className="rounded-lg border border-[#d7b85f]/25 bg-[#171f18] px-4 py-3 text-sm font-black uppercase tracking-wide text-[#f0d88b]">
          Swipe or drag sideways on mobile
        </p>
      </div>
    </section>
  );
}
