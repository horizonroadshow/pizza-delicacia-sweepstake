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
  sweepstakeSummary,
} from "@/data/sweepstake";
import type {
  FixturePreviewItem,
  FixturesPreview,
} from "@/lib/football/fixturePreview";

type FilterId = "all" | "two" | "one" | "eliminated";

const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "two", label: "Two teams remaining" },
  { id: "one", label: "One team remaining" },
  { id: "eliminated", label: "Eliminated" },
];

function remainingTeams(participant: Participant) {
  return countParticipantTeamsRemaining(participant);
}

function filterParticipants(participants: Participant[], activeFilter: FilterId) {
  if (activeFilter === "all") {
    return participants;
  }

  return participants.filter((participant) => {
    const remaining = remainingTeams(participant);

    if (activeFilter === "two") {
      return remaining === 2;
    }

    if (activeFilter === "one") {
      return remaining === 1;
    }

    return remaining === 0;
  });
}

function FixtureTeam({ team }: { team: FixturePreviewItem["home"] }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-base font-black text-[#fff4d7]">
        {team.name}
      </p>
      <p className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-[#b8c0ae]">
        {team.owner ? team.owner : "No family owner"}
      </p>
    </div>
  );
}

function FixtureCard({ fixture }: { fixture: FixturePreviewItem }) {
  return (
    <article className="rounded-lg border border-[#c7a653]/25 bg-[#0e1915] p-3 shadow-[0_14px_35px_rgba(0,0,0,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-[#c7a653]">
          {fixture.stageLabel}
        </p>
        <span className="rounded-full border border-[#d7b85f]/25 bg-[#251f12] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#f0d88b]">
          {fixture.statusLabel}
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-[#b8c0ae]">
        {fixture.kickoffLabel}
      </p>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <FixtureTeam team={fixture.home} />
        <span className="rounded-md border border-[#d7b85f]/25 bg-[#251f12] px-3 py-2 text-sm font-black text-[#f0d88b]">
          {fixture.scoreLabel}
        </span>
        <div className="text-right">
          <FixtureTeam team={fixture.away} />
        </div>
      </div>
    </article>
  );
}

function FixtureGroup({
  fixtures,
  title,
}: {
  fixtures: FixturePreviewItem[];
  title: string;
}) {
  if (fixtures.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#c7a653]">
        {title}
      </h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {fixtures.map((fixture) => (
          <FixtureCard fixture={fixture} key={fixture.id} />
        ))}
      </div>
    </div>
  );
}

export function SweepstakeDashboard({
  fixturesPreview,
  knockoutDraw,
  participants,
}: {
  fixturesPreview: FixturesPreview;
  knockoutDraw: KnockoutDraw;
  participants: Participant[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const teamsRemaining = participants.reduce(
    (total, participant) => total + remainingTeams(participant),
    0,
  );
  const teamsEliminated = sweepstakeSummary.teamCount - teamsRemaining;
  const eliminatedParticipants = participants.filter(
    (participant) => remainingTeams(participant) === 0,
  ).length;

  const filteredParticipants = useMemo(() => {
    const filteredByStatus = filterParticipants(participants, activeFilter);
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return filteredByStatus;
    }

    return filteredByStatus.filter((participant) => {
      const searchableText = [
        participant.name,
        ...participant.teams.map((team) => team.country),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
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
                Pizza Delicacia
              </span>
              <span className="block text-base font-black text-[#fff4d7]">
                World Cup Sweepstake
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
                {sweepstakeSummary.name}
              </h1>
              <p className="mt-3 max-w-3xl text-lg leading-8 text-[#d9dccf]">
                Everyone started with two teams. Right now {teamsRemaining} teams
                are still in, {teamsEliminated} have been eliminated, and{" "}
                {eliminatedParticipants} family members are fully out.
              </p>
            </div>
            <div className="rounded-lg border border-[#d7b85f]/35 bg-[#171f18] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c7a653]">
                Rules snapshot
              </p>
              <div className="mt-3 grid gap-2 text-base font-bold text-[#fff4d7]">
                <p>Entry: {sweepstakeSummary.entryFee} each</p>
                <p>Prize split: {sweepstakeSummary.prizeSplit}</p>
                <p>Editor later: Ajay only</p>
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
            detail="Two teams each"
            icon="◆"
            label="Teams"
            value={`${sweepstakeSummary.teamCount}`}
          />
          <StatCard
            detail="£5 per player"
            icon="£"
            label="Prize pot"
            value={sweepstakeSummary.prizePot}
          />
          <StatCard
            detail={`${teamsEliminated} teams eliminated`}
            icon="●"
            label="Tournament status"
            value={`${teamsRemaining} in`}
          />
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <PrizeCard
            note="For the owner of the World Cup winning team. If one person owns both finalists, they receive both prizes."
            place="First prize"
            prize="£100"
          />
          <PrizeCard
            note="For the owner of the losing finalist. If one person owns both finalists, they receive both prizes."
            place="Second prize"
            prize="£20"
          />
        </section>

        <section
          className="mt-5 rounded-lg border border-[#c7a653]/25 bg-[#0d1814] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)] sm:p-5"
          id="entrants"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#c7a653]">
                Who is still in?
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#fff4d7]">
                Family leaderboard
              </h2>
              <p className="mt-2 text-base font-semibold text-[#b8c0ae]">
                Showing {filteredParticipants.length} of {participants.length}
              </p>
            </div>
            <label className="w-full max-w-xl" htmlFor="entrant-search">
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
            className="mt-5 flex gap-2 overflow-x-auto pb-1"
            role="group"
          >
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;

              return (
                <button
                  aria-pressed={isActive}
                  className={`min-h-12 shrink-0 rounded-lg border px-4 py-3 text-sm font-black uppercase tracking-wide transition ${
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
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  available in the wall chart.
                </p>
                <FixtureGroup
                  fixtures={fixturesPreview.remaining}
                  title="Remaining fixtures"
                />
                <FixtureGroup
                  fixtures={fixturesPreview.live}
                  title="Live now"
                />
                <FixtureGroup
                  fixtures={fixturesPreview.today}
                  title="Today"
                />
                <FixtureGroup
                  fixtures={fixturesPreview.recent}
                  title="Recent results"
                />
                {fixturesPreview.remaining.length === 0 &&
                fixturesPreview.live.length === 0 &&
                fixturesPreview.today.length === 0 &&
                fixturesPreview.recent.length === 0 ? (
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
