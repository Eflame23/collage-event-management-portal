import { useState } from "react";
import { Terminal, X } from "lucide-react";
import { BUILD_LOGS } from "./data";

const STATUS_ITEMS = [
  { label: "CI Pipeline: Passing (GitHub Actions)" },
  { label: "Quality Gate: DoD Satisfied (13/13 Unit Tests Passed)" },
  { label: "Container: portal-backend:v2.1-live (Docker)" },
];

export function DevOpsFooter() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Terminal drawer */}
      <div
        aria-hidden={!open}
        className={`fixed inset-x-0 bottom-11 z-50 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-[calc(100%+2.75rem)]"
        }`}
      >
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-t-xl border border-white/10 bg-portal-terminal shadow-portal">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <p className="flex items-center gap-2 text-xs font-bold text-white/80">
                <Terminal className="size-3.5 text-portal-ok" />
                portal-frontend — build logs
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close terminal"
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <pre className="scrollbar-thin max-h-56 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-white/80">
{BUILD_LOGS.join("\n")}
            </pre>
          </div>
        </div>
      </div>

      {/* Sticky DevOps bar */}
      <footer
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        title="Click to open build logs"
        className="fixed inset-x-0 bottom-0 z-40 cursor-pointer bg-portal-purple-deep px-4 py-2.5 text-center transition-colors hover:bg-portal-regal"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[11px] font-semibold text-white/85 sm:text-xs">
          {STATUS_ITEMS.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-portal-ok shadow-[0_0_6px_var(--portal-ok)]"
              />
              {item.label}
            </span>
          ))}
        </div>
      </footer>
    </>
  );
}
