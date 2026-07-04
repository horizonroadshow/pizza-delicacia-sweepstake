"use client";

import { useMemo, useState } from "react";
import { ParticipantCard } from "@/components/ParticipantCard";
import { PlaceholderPanel } from "@/components/PlaceholderPanel";
import { PrizeCard } from "@/components/PrizeCard";
import { StatCard } from "@/components/StatCard";
import type { Participant } from "@/data/sweepstake";
import { sweepstakeSummary } from "@/data/sweepstake";

type FilterId = "all" | "two" | "one" | "eliminated";

const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "two", label: "Two teams remaining" },
  { id: "one", label: "One team remaining" },
  { id: "eliminated", label: "Eliminated" },
];

function remainingTeams(participant: Participant) {
  return participant.teams.filter((team) => team.status === "still-in").length;
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

export function SweepstakeDashboard({
  participants,
}: {
  participants: Participant[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
            <a className="rounded-md px-3 py-2 hover:bg-[#13211c]" href="#entrants">
              Entrants
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-[#13211c]" href="#knockout">
              Knockout
            </a>
            <a className="rounded-md px-3 py-2 hover:bg-[#13211c]" href="#fixtures">
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
                Everyone has two teams, every team is currently still in, and
                the prizes will go to the owners of the World Cup winner and
                losing finalist.
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
            detail="All teams still in"
            icon="●"
            label="Tournament status"
            value="Live"
          />
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2">
          <PrizeCard
            note="For the owner of the World Cup winning team."
            place="First prize"
            prize="TBC"
          />
          <PrizeCard
            note="For the owner of the losing finalist."
            place="Second prize"
            prize="TBC"
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

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div id="knockout">
            <PlaceholderPanel
              description="A compact tournament path will sit here once the fixture data is ready."
              title="Knockout wall-chart preview"
            >
              <div className="grid gap-3 text-sm font-black text-[#fff4d7] sm:grid-cols-4">
                {["Round of 32", "Round of 16", "Quarter-finals", "Final"].map(
                  (round, index) => (
                    <div
                      className="rounded-lg border border-[#c7a653]/25 bg-[#0e1915] p-3"
                      key={round}
                    >
                      <p className="text-xs uppercase tracking-wide text-[#c7a653]">
                        {round}
                      </p>
                      <div className="mt-3 grid gap-2">
                        <span className="rounded-md bg-[#172820] px-3 py-2">
                          {index === 3 ? "Winner" : "Team"}
                        </span>
                        <span className="rounded-md border border-dashed border-[#c7a653]/30 px-3 py-2 text-[#b8c0ae]">
                          TBC
                        </span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </PlaceholderPanel>
          </div>

          <div id="fixtures">
            <PlaceholderPanel
              description="Scores and automatic updates will be added later. For now, this shows the planned match-card style."
              title="Fixtures and results preview"
            >
              <div className="grid gap-3">
                {[
                  ["Opening fixture", "Team TBC", "Team TBC"],
                  ["Next family watch", "Winner path", "Runner-up path"],
                  ["Final", "First prize", "Second prize"],
                ].map(([label, home, away]) => (
                  <div
                    className="rounded-lg border border-[#c7a653]/25 bg-[#0e1915] p-3"
                    key={label}
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-[#c7a653]">
                      {label}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-base font-black text-[#fff4d7]">
                      <span>{home}</span>
                      <span className="rounded-md bg-[#251f12] px-2 py-1 text-sm text-[#f0d88b]">
                        v
                      </span>
                      <span className="text-right">{away}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PlaceholderPanel>
          </div>
        </section>
      </main>
    </div>
  );
}
