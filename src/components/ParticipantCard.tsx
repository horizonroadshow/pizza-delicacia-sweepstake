import type { AllocatedTeam, Participant } from "@/data/sweepstake";
import { countParticipantTeamsRemaining } from "@/data/sweepstake";

function TeamRow({ team }: { team: AllocatedTeam }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-[#d7b85f]/15 bg-[#0e1915] px-3 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-label={`${team.country} flag`}
          className="text-4xl leading-none"
          role="img"
        >
          {team.flag}
        </span>
        <span className="truncate text-base font-black text-[#fff4d7] sm:text-lg">
          {team.country}
        </span>
      </span>
      <span className="shrink-0 rounded-full border border-[#70b36f]/40 bg-[#14351f] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#bff2a5]">
        Still in
      </span>
    </li>
  );
}

export function ParticipantCard({ participant }: { participant: Participant }) {
  const teamsStillIn = countParticipantTeamsRemaining(participant);

  return (
    <article className="rounded-lg border border-[#c7a653]/25 bg-[#13211c] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[#d7b85f]/60 hover:bg-[#172820]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-[#fff4d7]">
            {participant.name}
          </h3>
          <p className="mt-1 text-sm font-bold uppercase tracking-wide text-[#c7a653]">
            {teamsStillIn} teams remaining
          </p>
        </div>
        <span className="rounded-full border border-[#d7b85f]/40 bg-[#251f12] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#f0d88b]">
          Still in
        </span>
      </div>

      <ul
        className="mt-4 grid gap-2.5"
        aria-label={`${participant.name}'s teams`}
      >
        {participant.teams.map((team) => (
          <TeamRow key={team.country} team={team} />
        ))}
      </ul>
    </article>
  );
}
