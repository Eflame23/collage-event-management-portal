import { Award, Gauge, TrendingDown } from "lucide-react";
import {
  AVERAGE_VELOCITY,
  BURNDOWN_ACTUAL,
  MOSCOW_BACKLOG,
  SPRINT_TOTAL_SP,
  SPRINT_VELOCITY,
} from "./data";

export function SprintMetrics() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SPRINT_VELOCITY.map(({ sprint, points }) => (
          <KpiCard key={sprint} label={sprint} value={`${points} SP`} hint="Committed & delivered" />
        ))}
        <KpiCard
          label="Average Velocity"
          value={`${AVERAGE_VELOCITY.toFixed(2)} SP`}
          hint="Across 3 sprints"
          highlight
        />
      </div>

      {/* Burndown chart */}
      <section className="rounded-2xl border border-portal-hairline bg-card p-6 shadow-portal">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
              <TrendingDown className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-portal-regal">
                Sprint Burndown — 10 Days
              </h2>
              <p className="text-xs text-muted-foreground">Ideal vs. actual remaining story points</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-portal-hairline" />
              Ideal
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-5 rounded-full bg-portal-gold" />
              Actual
            </span>
          </div>
        </div>
        <BurndownChart />
      </section>

      {/* MoSCoW backlog */}
      <section className="overflow-hidden rounded-2xl border border-portal-hairline bg-card shadow-portal">
        <div className="flex items-center gap-3 border-b border-portal-hairline px-6 py-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-portal-gold-soft text-portal-gold-text">
            <Gauge className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-portal-regal">
              MoSCoW Product Backlog
            </h2>
            <p className="text-xs text-muted-foreground">Agile jury deliverable — US01 to US05</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-portal-hairline bg-secondary text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <th className="px-6 py-3">ID</th>
                <th className="px-4 py-3">User Story</th>
                <th className="px-4 py-3">MoSCoW</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOSCOW_BACKLOG.map((row) => (
                <tr key={row.id} className="border-b border-portal-hairline last:border-0">
                  <td className="px-6 py-3 font-mono text-xs font-bold text-portal-purple">{row.id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.story}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-portal-purple/10 px-2.5 py-1 text-[11px] font-bold text-portal-purple">
                      {row.moscow}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{row.priority}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        row.status === "Done"
                          ? "bg-portal-ok/15 text-portal-ok"
                          : row.status === "In Progress"
                            ? "bg-portal-gold-soft text-portal-gold-text"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-portal ${
        highlight ? "border-portal-gold/50 bg-portal-gold-soft" : "border-portal-hairline bg-card"
      }`}
    >
      <div className="flex items-center gap-2">
        <Award className={`size-4 ${highlight ? "text-portal-gold-text" : "text-portal-gold"}`} />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-portal-regal">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const W = 560;
const H = 240;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

function BurndownChart() {
  const days = BURNDOWN_ACTUAL.length - 1; // 10 working days
  const x = (day: number) => PAD_L + ((W - PAD_L - PAD_R) * day) / days;
  const y = (sp: number) => PAD_T + ((H - PAD_T - PAD_B) * (SPRINT_TOTAL_SP - sp)) / SPRINT_TOTAL_SP;

  const idealPoints = `${x(0)},${y(SPRINT_TOTAL_SP)} ${x(days)},${y(0)}`;
  const actualPoints = BURNDOWN_ACTUAL.map((sp, i) => `${x(i)},${y(sp)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Burndown chart, ideal versus actual remaining story points over 10 days"
      className="mt-4 w-full"
    >
      {[0, 5, 10, 15, 20].map((sp) => (
        <g key={sp}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(sp)}
            y2={y(sp)}
            stroke="var(--portal-hairline)"
            strokeWidth="1"
          />
          <text x={PAD_L - 8} y={y(sp) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">
            {sp}
          </text>
        </g>
      ))}
      {Array.from({ length: days + 1 }, (_, d) => (d % 2 === 0 || d === days ? d : null))
        .filter((d): d is number => d !== null)
        .map((d) => (
          <text key={d} x={x(d)} y={H - 10} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
            D{d}
          </text>
        ))}
      <polyline
        points={idealPoints}
        fill="none"
        stroke="var(--portal-hairline)"
        strokeWidth="2"
        strokeDasharray="6 5"
      />
      <polyline
        points={actualPoints}
        fill="none"
        stroke="var(--portal-gold)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {BURNDOWN_ACTUAL.map((sp, i) => (
        <circle key={i} cx={x(i)} cy={y(sp)} r="3" fill="var(--portal-gold)" />
      ))}
    </svg>
  );
}
