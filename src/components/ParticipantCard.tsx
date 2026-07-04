import type { AllocatedTeam, Participant } from "@/data/sweepstake";
import { countParticipantTeamsRemaining } from "@/data/sweepstake";

function TeamRow({ team }: { team: AllocatedTeam }) {
  const isEliminated = team.status === "eliminated";

  return (
    <li
      className={`grid min-w-0 gap-3 rounded-md border px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
        isEliminated
          ? "border-[#c7a653]/10 bg-[#0b1512] opacity-80"
          : "border-[#70b36f]/35 bg-[#14351f] shadow-[0_10px_24px_rgba(112,179,111,0.08)]"
      }`}
    >
      <span className="flex min-w-0 items-start gap-3">
        <span
          aria-label={`${team.country} flag`}
          className="shrink-0 text-4xl leading-none"
          role="img"
        >
          {team.flag}
        </span>
        <span
          className={`min-w-0 [overflow-wrap:anywhere] text-base font-black leading-snug sm:text-lg ${
            isEliminated ? "text-[#d9dccf]" : "text-[#fff4d7]"
          }`}
        >
          {team.country}
        </span>
      </span>
      <span
        className={`w-fit max-w-full rounded-full border px-3 py-1 text-xs font-black uppercase leading-tight tracking-wide sm:justify-self-end ${
          isEliminated
            ? "border-[#c96f60]/45 bg-[#351b18] text-[#ffb5a8]"
            : "border-[#70b36f]/40 bg-[#14351f] text-[#bff2a5]"
        }`}
      >
        {isEliminated ? "Eliminated" : "Still in"}
      </span>
    </li>
  );
}

export function ParticipantCard({ participant }: { participant: Participant }) {
  const teamsStillIn = countParticipantTeamsRemaining(participant);
  const participantStatus =
    teamsStillIn === 0
      ? "Eliminated"
      : teamsStillIn === 1
        ? "One left"
        : "Still in";
  const participantStatusClasses =
    teamsStillIn === 0
      ? "border-[#c96f60]/45 bg-[#351b18] text-[#ffb5a8]"
      : teamsStillIn === 1
        ? "border-[#d7b85f]/40 bg-[#251f12] text-[#f0d88b]"
        : "border-[#70b36f]/40 bg-[#14351f] text-[#bff2a5]";
  const remainingLabel =
    teamsStillIn === 0
      ? "Eliminated"
      : `${teamsStillIn} ${teamsStillIn === 1 ? "team" : "teams"} remaining`;

  return (
    <article className="min-w-0 rounded-lg border border-[#c7a653]/25 bg-[#13211c] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[#d7b85f]/60 hover:bg-[#172820]">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h3 className="[overflow-wrap:anywhere] text-2xl font-black leading-tight text-[#fff4d7]">
            {participant.name}
          </h3>
          <p className="mt-1 text-sm font-bold uppercase tracking-wide text-[#c7a653]">
            {remainingLabel}
          </p>
        </div>
        <span
          className={`w-fit max-w-full rounded-full border px-3 py-2 text-xs font-black uppercase leading-tight tracking-wide sm:justify-self-end ${participantStatusClasses}`}
        >
          {participantStatus}
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
