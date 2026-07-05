"use client";

import { useMemo, useState } from "react";
import { KnockoutWallChart } from "@/components/KnockoutWallChart";
import { ParticipantCard } from "@/components/ParticipantCard";
import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { PrizeCard } from "@/components/PrizeCard";
import { StatCard } from "@/components/StatCard";
import type { KnockoutDraw } from "@/data/knockout";
import type { Participant } from "@/data/sweepstake";
import {
  countParticipantTeamsRemaining,
  createSweepstakeSummary,
} from "@/data/sweepstake";
import type { SweepstakeConfig } from "@/data/sweepstakes";
import type {
  FixturePreviewItem,
  FixturePreviewRoundGroup,
  FixturesPreview,
} from "@/lib/football/fixturePreview";
import type { FixtureOddsDisplay, OddsPreview } from "@/lib/odds/displayTypes";

type FilterId = "still-in" | "all" | "eliminated" | `remaining-${number}`;

function numberWord(value: number) {
  const words: Record<number, string> = {
    1: "One",
    2: "Two",
    3: "Three",
  };

  return words[value] ?? `${value}`;
}

function filtersForTeamsPerParticipant(teamsPerParticipant: number) {
  return [
    { id: "still-in" as const, label: "Still in the running" },
    { id: "all" as const, label: "Everyone" },
    ...Array.from({ length: teamsPerParticipant }, (_, index) => {
      const remaining = teamsPerParticipant - index;

      return {
        id: `remaining-${remaining}` as const,
        label: `${numberWord(remaining)} ${
          remaining === 1 ? "team" : "teams"
        } remaining`,
      };
    }),
    { id: "eliminated" as const, label: "Eliminated" },
  ];
}

function compactTitleLine(line: string) {
  return line.replace(/\s*[🍕⚽️]+/gu, "").trim();
}

function remainingTeams(participant: Participant) {
  return countParticipantTeamsRemaining(participant);
}

function filterParticipants(participants: Participant[], activeFilter: FilterId) {
  if (activeFilter === "all") {
    return participants;
  }

  return participants.filter((participant) => {
    const remaining = remainingTeams(participant);

    if (activeFilter === "still-in") {
      return remaining > 0;
    }

    if (activeFilter.startsWith("remaining-")) {
      return remaining === Number(activeFilter.replace("remaining-", ""));
    }

    return remaining === 0;
  });
}

function sortParticipantsForFilter(
  participants: Participant[],
  activeFilter: FilterId,
) {
  if (activeFilter !== "still-in") {
    return participants;
  }

  return [...participants].sort(
    (a, b) =>
      remainingTeams(b) - remainingTeams(a) ||
      a.name.localeCompare(b.name, "en-GB"),
  );
}

function FixtureTeam({ team }: { team: FixturePreviewItem["home"] }) {
  const teamLabel = team.flag ? `${team.name} ${team.flag}` : team.name;

  return (
    <div className="min-w-0">
      <p className="truncate text-base font-black text-[#fff4d7]">
        {teamLabel}
      </p>
      <p className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-[#b8c0ae]">
        {team.owner ? team.owner : "TBC"}
      </p>
    </div>
  );
}

function roundedPercentage(value: number) {
  return `${Math.round(value)}%`;
}

function oddsUpdatedLabel(fetchedAt?: string, stale = false) {
  if (!fetchedAt) {
    return undefined;
  }

  const timestamp = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(fetchedAt));

  return `${stale ? "Using cached odds" : "Odds last updated"}: ${timestamp}`;
}

function FixtureOddsPanel({ odds }: { odds?: FixtureOddsDisplay }) {
  if (!odds) {
    return (
      <p className="mt-3 rounded-md border border-[#c7a653]/15 bg-[#111d19] px-3 py-2 text-sm font-bold text-[#b8c0ae]">
        Odds TBC
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-[#c7a653]/20 bg-[#111d19] p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
        Fixture odds
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {odds.probabilities.map((probability) => (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
              probability.label === odds.favourite
                ? "border-[#d7b85f] bg-[#d7b85f] text-[#07110f]"
                : "border-[#c7a653]/25 bg-[#0b1512] text-[#d9dccf]"
            }`}
            key={`${probability.side}-${probability.label}`}
          >
            {probability.label} {roundedPercentage(probability.percentage)}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs font-bold text-[#b8c0ae]">
        {odds.favourite ? `Favourite: ${odds.favourite}` : "Favourite TBC"}
        {odds.underdog ? ` · Underdog: ${odds.underdog}` : ""}
      </p>
    </div>
  );
}

function FixtureCard({
  compact = false,
  fixture,
  muted = false,
}: {
  compact?: boolean;
  fixture: FixturePreviewItem;
  muted?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border border-[#c7a653]/25 bg-[#0e1915] shadow-[0_14px_35px_rgba(0,0,0,0.16)] ${
        compact ? "p-2.5 opacity-85" : "p-3"
      } ${muted ? "border-[#c7a653]/15 bg-[#0b1512]" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-[#c7a653]">
          {fixture.stageLabel}
        </p>
        <span className="rounded-full border border-[#d7b85f]/25 bg-[#251f12] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#f0d88b]">
          {fixture.statusLabel}
        </span>
      </div>
      <p className={`mt-2 font-bold text-[#b8c0ae] ${compact ? "text-xs" : "text-sm"}`}>
        {fixture.kickoffLabel}
      </p>

      <div
        className={`mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ${
          compact ? "gap-2" : "gap-3"
        }`}
      >
        <FixtureTeam team={fixture.home} />
        <span className="rounded-md border border-[#d7b85f]/25 bg-[#251f12] px-3 py-2 text-sm font-black text-[#f0d88b]">
          {fixture.scoreLabel}
        </span>
        <div className="text-right">
          <FixtureTeam team={fixture.away} />
        </div>
      </div>

      {!compact && fixture.statusLabel !== "Finished" ? (
        <FixtureOddsPanel odds={fixture.odds} />
      ) : null}
    </article>
  );
}

function BookiesCornerSection({ oddsPreview }: { oddsPreview: OddsPreview }) {
  const updatedLabel = oddsUpdatedLabel(
    oddsPreview.fetchedAt,
    oddsPreview.oddsAreStale,
  );
  const oddsBasisCopy = oddsPreview.outrightWinnerAvailable
    ? "Outright winner odds use averaged bookmaker prices and normalised market-implied probabilities. Fixture cards still use upcoming match markets."
    : "Based on available upcoming match odds. Outright tournament odds are not currently available.";

  if (oddsPreview.marketWatchCards.length === 0) {
    return (
      <section className="mt-4 rounded-lg border border-[#c7a653]/20 bg-[#0d1814] p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
              Odds update
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#fff4d7]">
              Bookies&apos; Corner
            </h2>
          </div>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-[#b8c0ae]">
            Odds are for sweepstake entertainment only and may change.
          </p>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#b8c0ae]">
          {oddsBasisCopy}
        </p>
        <p className="mt-3 rounded-lg border border-[#c7a653]/15 bg-[#111d19] p-3 text-sm font-bold text-[#b8c0ae]">
          Odds TBC for now. Fixtures still show as normal, and this corner will
          fill back in when the provider returns usable match markets.
        </p>
        {updatedLabel ? (
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#c7a653]">
            {updatedLabel}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-lg border border-[#c7a653]/25 bg-[#0d1814] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
            Odds update
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#fff4d7]">
            Bookies&apos; Corner
          </h2>
        </div>
        <p className="max-w-2xl text-sm font-semibold leading-6 text-[#b8c0ae]">
          Odds are for sweepstake entertainment only and may change.
        </p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#b8c0ae]">
        {oddsBasisCopy}
      </p>
      {updatedLabel ? (
        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#c7a653]">
          {updatedLabel}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {oddsPreview.marketWatchCards.map((card) => (
          <article
            className={`rounded-lg border border-[#c7a653]/20 bg-[#111d19] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.16)] ${
              card.rankingRows ? "md:col-span-2 xl:col-span-2" : ""
            }`}
            key={`${card.eyebrow}-${card.title}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
              {card.eyebrow}
            </p>
            <h3 className="mt-2 text-lg font-black text-[#fff4d7]">
              {card.title}
            </h3>
            {card.rankingRows ? (
              <div className="mt-3 space-y-3">
                {card.rankingRows.map((row) => (
                  <div
                    className="rounded-md border border-[#c7a653]/15 bg-[#0d1814] px-3 py-2"
                    key={`${row.place}-${row.owner}`}
                  >
                    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="min-w-0 text-base font-black text-[#fff4d7]">
                        <span className="text-[#c7a653]">{row.place}.</span>{" "}
                        {row.owner}
                      </p>
                      <p className="text-base font-black text-[#f0d88b]">
                        {row.percentage}
                      </p>
                    </div>
                    <p className="mt-1 break-words text-sm font-bold leading-6 text-[#b8c0ae]">
                      {row.teams}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold leading-6 text-[#b8c0ae]">
                {card.detail}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function FixtureRoundGroup({ group }: { group: FixturePreviewRoundGroup }) {
  const hasRemaining = group.remaining.length > 0;
  const hasCompleted = group.completed.length > 0;

  if (!hasRemaining && !hasCompleted) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#c7a653]/20 bg-[#0b1512] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#c7a653]">
          {group.title}
        </h3>
        <span className="rounded-full border border-[#d7b85f]/25 bg-[#251f12] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#f0d88b]">
          {group.remaining.length} to play
        </span>
      </div>

      {hasRemaining ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {group.remaining.map((fixture) => (
            <FixtureCard fixture={fixture} key={fixture.id} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-[#c7a653]/15 bg-[#0e1915] p-3 text-sm font-bold text-[#b8c0ae]">
          No remaining fixtures in this round.
        </p>
      )}

      {hasCompleted ? (
        <details className="mt-3 rounded-lg border border-[#c7a653]/15 bg-[#0e1915]">
          <summary className="cursor-pointer px-3 py-2 text-sm font-black uppercase tracking-wide text-[#d9dccf]">
            Completed results ({group.completed.length})
          </summary>
          <div className="grid gap-2 border-t border-[#c7a653]/10 p-2 lg:grid-cols-2">
            {group.completed.map((fixture) => (
              <FixtureCard
                compact
                fixture={fixture}
                key={fixture.id}
                muted
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function SweepstakeDashboard({
  config,
  fixturesPreview,
  knockoutDraw,
  oddsPreview,
  participants,
}: {
  config: SweepstakeConfig;
  fixturesPreview: FixturesPreview;
  knockoutDraw: KnockoutDraw;
  oddsPreview: OddsPreview;
  participants: Participant[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("still-in");
  const [searchTerm, setSearchTerm] = useState("");
  const filters = useMemo(
    () => filtersForTeamsPerParticipant(config.teamsPerParticipant),
    [config.teamsPerParticipant],
  );
  const sweepstakeSummary = createSweepstakeSummary(config, participants);
  const teamsRemaining = participants.reduce(
    (total, participant) => total + remainingTeams(participant),
    0,
  );
  const teamsEliminated = sweepstakeSummary.teamCount - teamsRemaining;
  const eliminatedParticipants = participants.filter(
    (participant) => remainingTeams(participant) === 0,
  ).length;
  const participantsRemaining =
    sweepstakeSummary.playerCount - eliminatedParticipants;

  const filteredParticipants = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      return participants.filter((participant) => {
        const searchableText = [
          participant.name,
          ...participant.teams.map((team) => team.country),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      });
    }

    return sortParticipantsForFilter(
      filterParticipants(participants, activeFilter),
      activeFilter,
    );
  }, [activeFilter, participants, searchTerm]);

  return (
    <div className="min-h-screen bg-[#07110f] text-[#fff4d7]">
      <header className="sticky top-0 z-20 border-b border-[#c7a653]/20 bg-[#07110f]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a
            className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d7b85f]"
            href="#top"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d7b85f]/45 bg-[#13211c] text-xl">
              ⚽
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-[0.18em] text-[#c7a653]">
                {compactTitleLine(config.displayTitleLines[0])}
              </span>
              <span className="block text-base font-black text-[#fff4d7]">
                {compactTitleLine(config.displayTitleLines[1])}
              </span>
            </span>
          </a>

          <nav
            aria-label="Page sections"
            className="hidden items-center gap-2 text-sm font-bold text-[#d9dccf] md:flex"
          >
            <a className="rounded-md px-3 py-2 hover:bg-[#13211c]" href="#top">
              Home
            </a>
            <a
              className="rounded-md px-3 py-2 hover:bg-[#13211c]"
              href="#entrants"
            >
              Entrants
            </a>
            <a
              className="rounded-md px-3 py-2 hover:bg-[#13211c]"
              href="#knockout"
            >
              Knockout
            </a>
            <a
              className="rounded-md px-3 py-2 hover:bg-[#13211c]"
              href="#fixtures"
            >
              Fixtures
            </a>
          </nav>

          <div className="hidden rounded-md border border-[#d7b85f]/35 bg-[#171f18] px-3 py-2 text-sm font-black text-[#f0d88b] sm:block">
            {sweepstakeSummary.prizePot} pot
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl px-4 py-5 sm:py-7">
        <section className="rounded-lg border border-[#c7a653]/25 bg-[#0d1814] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
                Family last-team-standing sweepstake
              </p>
              <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#fff4d7] sm:text-5xl">
                {config.displayTitleLines.map((line) => (
                  <span className="block" key={line}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-3 max-w-3xl text-lg leading-8 text-[#d9dccf]">
                {sweepstakeSummary.teamCount} teams started, {teamsEliminated}{" "}
                have been eliminated, {teamsRemaining} remain.
              </p>
              <p className="mt-2 max-w-3xl text-lg leading-8 text-[#d9dccf]">
                {sweepstakeSummary.playerCount} family members,{" "}
                {sweepstakeSummary.teamsPerParticipant} teams each.{" "}
                {eliminatedParticipants} are out, {participantsRemaining} remain.
              </p>
            </div>
            <div className="rounded-lg border border-[#d7b85f]/35 bg-[#171f18] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
                Rules snapshot
              </p>
              <div className="mt-3 grid gap-2 text-base font-bold text-[#fff4d7]">
                <p>Entry: {sweepstakeSummary.entryFee} each</p>
                <p>Prize split: {sweepstakeSummary.prizeSplit}</p>
                <p>Commissioner: {config.commissioner}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            detail="Family members"
            icon="★"
            label="Players"
            value={`${sweepstakeSummary.playerCount}`}
          />
          <StatCard
            detail={`${numberWord(sweepstakeSummary.teamsPerParticipant)} teams each`}
            icon="◆"
            label="Teams"
            value={`${sweepstakeSummary.teamCount}`}
          />
          <StatCard
            detail={`${sweepstakeSummary.entryFee} per player`}
            icon="£"
            label="Prize pot"
            value={sweepstakeSummary.prizePot}
          />
          <StatCard
            detail={`${teamsEliminated} teams eliminated`}
            icon="●"
            label="Tournament status"
            value={`${teamsRemaining} teams remain`}
          />
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <PrizeCard
            note="For the owner of the World Cup winning team. If one person owns both finalists, they receive both prizes."
            place="First prize"
            prize={config.prizeSplit.first}
          />
          <PrizeCard
            note="For the owner of the losing finalist. If one person owns both finalists, they receive both prizes."
            place="Second prize"
            prize={config.prizeSplit.second}
          />
        </section>

        <BookiesCornerSection oddsPreview={oddsPreview} />

        <section
          className="mt-5 rounded-lg border border-[#c7a653]/25 bg-[#0d1814] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)] sm:p-5"
          id="entrants"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
                Who is still in?
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#fff4d7]">
                Family leaderboard
              </h2>
              <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-[#d9dccf]">
                These are the players who still have at least one team alive.
                The £100 dream is still alive.
              </p>
              <p className="mt-2 text-base font-semibold text-[#b8c0ae]">
                Showing {filteredParticipants.length} of {participants.length}
              </p>
            </div>
            <label className="w-full lg:max-w-xl" htmlFor="entrant-search">
              <span className="sr-only">Search entrants or teams</span>
              <span className="relative block">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#c7a653]"
                >
                  ⌕
                </span>
                <input
                  className="min-h-14 w-full rounded-lg border border-[#c7a653]/30 bg-[#111d19] py-3 pl-11 pr-4 text-lg font-bold text-[#fff4d7] outline-none transition placeholder:text-[#858d7d] focus:border-[#d7b85f] focus:ring-2 focus:ring-[#d7b85f]/30"
                  id="entrant-search"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name or team"
                  type="search"
                  value={searchTerm}
                />
              </span>
            </label>
          </div>

          <div
            aria-label="Filter family entrants"
            className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-2"
            role="group"
          >
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={`min-h-12 max-w-[82vw] shrink-0 whitespace-normal rounded-lg border px-4 py-3 text-left text-sm font-black uppercase leading-tight tracking-wide transition sm:max-w-none sm:text-center ${
                    isActive
                      ? "border-[#d7b85f] bg-[#d7b85f] text-[#07110f] shadow-[0_10px_30px_rgba(215,184,95,0.16)]"
                      : "border-[#c7a653]/30 bg-[#111d19] text-[#d9dccf] hover:border-[#d7b85f]/70 hover:bg-[#16241f]"
                  }`}
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {filteredParticipants.length > 0 ? (
            <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredParticipants.map((participant) => (
                <ParticipantCard
                  key={participant.name}
                  participant={participant}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-[#c7a653]/30 bg-[#111d19] p-6 text-lg font-bold text-[#d9dccf]">
              Nobody matches this search and filter yet.
            </div>
          )}
        </section>

        <div className="mt-5">
          <KnockoutWallChart draw={knockoutDraw} />
        </div>

        <section className="mt-5">
          <div id="fixtures">
            <PlaceholderPanel
              description="Fixture and result data is provided by OpenFootball static data. Updates may lag official results."
              title="Fixtures and results"
            >
              <div className="grid gap-5">
                <p className="text-base font-semibold leading-7 text-[#b8c0ae]">
                  Only knockout-stage fixtures are shown here. The full path is
                  available in the wall chart. One result away from family
                  bragging rights.
                </p>
                <div className="grid gap-3">
                  {fixturesPreview.roundGroups.map((group) => (
                    <FixtureRoundGroup group={group} key={group.id} />
                  ))}
                </div>
                {fixturesPreview.roundGroups.length === 0 ? (
                  <div className="rounded-lg border border-[#c7a653]/25 bg-[#0e1915] p-4 text-base font-bold text-[#d9dccf]">
                    Knockout fixtures are not available from OpenFootball
                    static data right now.
                  </div>
                ) : null}
              </div>
            </PlaceholderPanel>
          </div>
        </section>
      </main>
    </div>
  );
}
