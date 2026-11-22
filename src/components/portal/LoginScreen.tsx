import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  LogIn,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";
import crestAsset from "@/assets/mit-adt-logo.jpg.asset.json";
import {
  AUTH_ERROR_MESSAGE,
  DEMO_PASSWORD,
  ROLES,
  ROLE_ID_LABELS,
  ROLE_LABELS,
  buildSession,
  validateCredentials,
  type Role,
  type SessionProfile,
} from "./portal-logic";

interface LoginScreenProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  /** Called only after the ID and password have been validated. */
  onSignIn: (profile: SessionProfile) => void;
}

const ROLE_ICONS: Record<Role, typeof GraduationCap> = {
  student: GraduationCap,
  faculty: Users,
  admin: ShieldCheck,
};

/** Generic format hints only: they show the shape of an ID, never a real person. */
const ID_PLACEHOLDERS: Record<Role, string> = {
  student: "Enter Student Enrollment ID (e.g. ADT24SOCB0000)",
  faculty: "Enter Faculty ID (e.g. FAC2024000)",
  admin: "Enter Admin ID (e.g. ADM2024000)",
};

export function LoginScreen({ theme, onThemeToggle, onSignIn }: LoginScreenProps) {
  const [role, setRole] = useState<Role>("student");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Picking a role tab starts from clean, empty fields and focuses the ID box.
  useEffect(() => {
    idRef.current?.focus();
  }, [role]);

  const selectRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    setUserId("");
    setPassword("");
    setShowPassword(false);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TC02: an empty / too-short ID or a wrong password never gets past this check.
    if (!validateCredentials(userId, password)) {
      setError(AUTH_ERROR_MESSAGE);
      if (!userId.trim()) idRef.current?.focus();
      else {
        passwordRef.current?.focus();
        passwordRef.current?.select();
      }
      return;
    }
    // TC01: build the session from whatever ID was typed; PortalApp stores it.
    setError(null);
    onSignIn(buildSession(role, userId));
  };

  const idLabel = ROLE_ID_LABELS[role];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-[#360D3A] px-8 py-10 text-white lg:px-14 lg:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#B8860B]/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-[#B8860B] sm:size-20">
            <img
              src={crestAsset.url}
              alt="MIT-ADT University crest"
              className="size-full object-cover"
            />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold tracking-wider sm:text-xl">
              MIT-ADT UNIVERSITY
            </p>
            <p className="mt-0.5 text-xs font-semibold text-[#E3B341] sm:text-sm">
              Campus Event Management Portal
            </p>
          </div>
        </div>

        <div className="relative mt-10 lg:mt-0">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Discover. Register.
            <br />
            Participate.
          </h1>
          <div className="mt-5 flex items-center gap-3">
            <span aria-hidden className="h-1 w-14 rounded-full bg-[#B8860B]" />
            <p className="text-sm font-semibold text-white/75">
              Make Every Moment Count at MIT-ADT
            </p>
          </div>
        </div>

        <p className="relative mt-10 hidden text-xs text-white/50 lg:block">
          © MIT-ADT University · Authorized campus users only
        </p>
      </aside>

      {/* Sign-in panel */}
      <main className="relative flex items-center justify-center bg-[#E6E4EE] px-4 py-10 dark:bg-background sm:px-8">
        <button
          type="button"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          onClick={onThemeToggle}
          className="absolute right-4 top-4 rounded-full p-2 text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        >
          {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </button>

        <div className="w-full max-w-xl rounded-2xl border border-portal-hairline bg-card p-6 shadow-portal sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#B8860B]/15 text-[#B8860B]">
              <LockKeyhole className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Sign In</h2>
              <p className="text-xs text-muted-foreground">
                Select your role, then enter your MIT-ADT ID and portal password.
              </p>
            </div>
          </div>

          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            <div
              role="tablist"
              aria-label="Select your role"
              className="grid grid-cols-3 gap-1.5 rounded-xl bg-secondary p-1.5"
            >
              {ROLES.map((r) => {
                const active = r === role;
                const RoleIcon = ROLE_ICONS[r];
                return (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    id={`login-tab-${r}`}
                    aria-selected={active}
                    aria-controls="login-panel"
                    onClick={() => selectRole(r)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                      active
                        ? "bg-[#B8860B] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    }`}
                  >
                    <RoleIcon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{ROLE_LABELS[r]}</span>
                  </button>
                );
              })}
            </div>

            <div id="login-panel" role="tabpanel" aria-labelledby={`login-tab-${role}`} className="space-y-5">
              <div>
                <label
                  htmlFor="portal-user-id"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {idLabel}
                </label>
                <input
                  ref={idRef}
                  id="portal-user-id"
                  type="text"
                  value={userId}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={ID_PLACEHOLDERS[role]}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                    error
                      ? "border-destructive focus:border-destructive focus:ring-destructive/25"
                      : "border-portal-hairline focus:border-[#B8860B] focus:ring-[#B8860B]/25"
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="portal-password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="portal-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="off"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter portal password"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "login-error login-hint" : "login-hint"}
                    className={`w-full rounded-lg border bg-background py-2.5 pl-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                      error
                        ? "border-destructive focus:border-destructive focus:ring-destructive/25"
                        : "border-portal-hairline focus:border-[#B8860B] focus:ring-[#B8860B]/25"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {error && (
                  <p
                    id="login-error"
                    role="alert"
                    className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-destructive"
                  >
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {error}
                  </p>
                )}
                <p id="login-hint" className="mt-2 text-[11px] text-muted-foreground">
                  Authorized portal PIN: {DEMO_PASSWORD}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#B8860B] py-3 text-sm font-bold text-white shadow-gold transition-colors hover:bg-[#B8860B]/90"
            >
              <LogIn className="size-4" aria-hidden />
              Sign In
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}