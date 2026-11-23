import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

import {
  type CampusEvent,
  type EventDraft,
  type NotificationItem,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
} from "./data";
import {
  type AttendeeInfo,
  type MutationResult,
  type Registration,
  type Role,
  type SessionProfile,
  attendeeFromEnrollmentId,
  cancelEvent,
  DUPLICATE_EVENT_TITLE_MESSAGE,
  DuplicateEventTitleError,
  PAST_EVENT_DATE_MESSAGE,
  cancelEventRemote,
  clearSession,
  changeRegistrationStatus,
  fetchAllRegistrations,
  findRegistration,
  findScheduleConflict,
  hasPermission,
  isDuplicateEventTitle,
  isPastEventDate,
  isNotificationVisibleTo,
  makeAttendeeTicketId,
  makeNotificationId,
  mergeEvents,
  publishEvent,
  publishEventRemote,
  readSession,
  registerOrWaitlist,
  registerOrWaitlistRemote,
  removeAndPromote,
  removeRegistrationRemote,
  setCheckIn,
  setCheckInRemote,
  setRegistrationStatusRemote,
  verifyTicket,
  waitlistPositions,
  writeSession,
} from "./portal-logic";
import {
  DuplicateRegistrationError,
  fetchEvents,
  getErrorMessage,
  insertNotificationRow,
  isSupabaseConfigured,
  loadPortalData,
  markAllNotificationsRead,
} from "@/lib/supabase";
import { Header, type TabName } from "./Header";
import { LoginScreen } from "./LoginScreen";
import { DiscoveryTab } from "./DiscoveryTab";
import { CampusCalendar } from "./CampusCalendar";
import { OrganizerHub, type PublishOutcome, type VerifyResult } from "./OrganizerHub";
import { PassesAlerts } from "./PassesAlerts";
import { RegisterModal } from "./RegisterModal";

interface ModalState {
  eventId: string;
  stage: "confirm" | "pass";
}

interface ConflictState {
  event: CampusEvent;
  clash: CampusEvent;
}

export function PortalApp() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Signed-in user (role + the ID typed at login); null shows the login screen. Read from
  // sessionStorage after mount (not during render) so server and client markup match.
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  // Permissions fall back to Student only while signed out, when no portal screen is rendered.
  const role: Role = session?.role ?? "student";
  // Enrollment / Faculty / Admin ID of the signed-in user ("" while signed out).
  const userId = session?.userId ?? "";
  const [events, setEvents] = useState<CampusEvent[]>([]);
  // Every registration row (all students, all statuses) — drives passes, waitlist and analytics.
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  // True only once data was loaded from Supabase. Otherwise the portal runs on
  // local demo data and never tries to write to the database.
  const [dbEnabled, setDbEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("Discovery & Events");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All Events");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const registeringRef = useRef(false);

  const isStudent = hasPermission(role, "register");

  // Registrant details derived from the Enrollment ID that signed in (nothing hardcoded).
  const attendeeInfo = useMemo(() => attendeeFromEnrollmentId(userId), [userId]);

  // Strict per-enrollment isolation: only rows where enrollment_id === session.userId.
  // A brand-new Enrollment ID therefore starts with zero passes.
  const myRegistrations = useMemo(
    () => (userId ? registrations.filter((r) => r.enrollmentId === userId) : []),
    [registrations, userId],
  );
  const approvedPasses = useMemo(
    () => myRegistrations.filter((r) => r.status === "Approved"),
    [myRegistrations],
  );
  // Only Approved rows count as "registered" on the Discovery / Calendar cards;
  // a waitlisted student still sees the "Join Waitlist" button for that event.
  const registeredIds = useMemo(
    () => new Set(approvedPasses.map((p) => p.eventId)),
    [approvedPasses],
  );
  const myWaitlistPositions = useMemo(
    () => waitlistPositions(registrations, userId),
    [registrations, userId],
  );
  // Notifications addressed to another ID (suffix after "@" in the row id) stay hidden.
  const visibleNotifications = useMemo(
    () => notifications.filter((n) => isNotificationVisibleTo(n.id, userId)),
    [notifications, userId],
  );
  const unreadCount = visibleNotifications.filter((n) => n.unread).length;

  // 0. Restore the session after a refresh; closing the tab (or logging out) clears it.
  useEffect(() => {
    setSession(readSession());
    setAuthChecked(true);
  }, []);

  // 1. On load: fetch events / registrations / notifications (seeding on first run).
  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!isSupabaseConfigured()) {
        console.warn(
          "VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are missing — using local demo data.",
        );
        setEvents(INITIAL_EVENTS);
        setNotifications(INITIAL_NOTIFICATIONS);
        setLoading(false);
        return;
      }
      try {
        // Per-student passes are derived from the full registrations table below,
        // filtered by Enrollment ID, so no attendee is passed here.
        const data = await loadPortalData("");
        const allRegistrations = await fetchAllRegistrations();
        if (ignore) return;
        setEvents(data.events);
        setRegistrations(allRegistrations);
        setNotifications(data.notifications);
        setDbEnabled(true);
      } catch (err) {
        if (ignore) return;
        console.error("Supabase load failed", err);
        toast.error(
          `Couldn't load from Supabase (${getErrorMessage(err)}). Showing local demo data.`,
        );
        setEvents(INITIAL_EVENTS);
        setNotifications(INITIAL_NOTIFICATIONS);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  /** `recipientId` addresses the notification to one Enrollment ID; omit it for a campus-wide broadcast. */
  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "unread">, recipientId?: string) => {
      const createdAt = new Date().toISOString();
      const next: NotificationItem = {
        ...item,
        id: makeNotificationId(recipientId),
        unread: true,
      };
      setNotifications((prev) => [next, ...prev]);
      if (dbEnabled) {
        insertNotificationRow(next, createdAt).catch((err) => {
          console.error("Could not save notification", err);
          toast.error("Notification shown here but couldn't be saved to the database.");
        });
      }
    },
    [dbEnabled],
  );

  /** Re-reads events + registrations (used after a conflicting write, e.g. another tab got there first). */
  const syncFromDb = useCallback(async () => {
    if (!dbEnabled) return;
    try {
      const [freshEvents, freshRegistrations] = await Promise.all([
        fetchEvents(),
        fetchAllRegistrations(),
      ]);
      setEvents((prev) => mergeEvents(prev, freshEvents));
      setRegistrations(freshRegistrations);
    } catch (err) {
      console.error("Could not re-sync from Supabase", err);
    }
  }, [dbEnabled]);

  // Whoever signs in sees the latest registrations from every device.
  useEffect(() => {
    if (userId) void syncFromDb();
  }, [userId, syncFromDb]);

  /** Applies a logic result to state and posts a Supabase notification for every waitlist promotion. */
  const applyMutation = useCallback(
    (result: MutationResult) => {
      setEvents(result.events);
      setRegistrations(result.registrations);
      for (const promoted of result.promoted) {
        const event = result.events.find((e) => e.id === promoted.eventId);
        if (!event) continue;
        const isMe = promoted.enrollmentId === userId;
        // Addressed to the promoted Enrollment ID, so only that student sees it.
        addNotification(
          {
            title: `You're in! Waitlist promotion: ${event.title}`,
            body: `A seat opened up and your pass ${promoted.ticketId} is now Approved. Check My Passes & Alerts.`,
            time: "Just now",
            kind: "info",
          },
          promoted.enrollmentId,
        );
        if (isMe) toast.success(`A seat opened up — you're confirmed for ${event.title}!`);
      }
    },
    [addNotification, userId],
  );

  /* ---------------------------------------------------------------- */
  /* Student actions                                                  */
  /* ---------------------------------------------------------------- */

  // 2. Register — or join the waitlist when the event is full.
  const handleRegister = useCallback(
    async (event: CampusEvent) => {
      if (!isStudent || !userId) {
        toast.warning(
          "Registrations are made from the Student account — log out and sign in as a student.",
        );
        return;
      }
      if (registeringRef.current) return;
      registeringRef.current = true;
      try {
        const outcome = dbEnabled
          ? await registerOrWaitlistRemote(events, registrations, event.id, attendeeInfo)
          : registerOrWaitlist(events, registrations, event.id, attendeeInfo);
        applyMutation(outcome);

        if (outcome.waitlisted) {
          setModal(null);
          addNotification(
            {
              title: `Waitlist joined: ${event.title}`,
              body: `You're Waitlist #${outcome.position}. Your pass is issued automatically when a seat opens up.`,
              time: "Just now",
              kind: "info",
            },
            userId,
          );
          toast.info(`${event.title} is full — you're Waitlist #${outcome.position}.`);
        } else {
          setModal({ eventId: event.id, stage: "pass" });
          addNotification(
            {
              title: `Gate pass issued for ${event.title}`,
              body: `Ticket ${outcome.registration.ticketId} — 1 seat booked. Check My Passes & Alerts.`,
              time: "Just now",
              kind: "info",
            },
            userId,
          );
          toast.success(`Registered for ${event.title}! Your digital gate pass is ready.`);
        }
      } catch (err) {
        toast.warning(getErrorMessage(err, "Registration failed."));
        if (err instanceof DuplicateRegistrationError) {
          // The database already has this registration (e.g. made in another tab): sync it.
          await syncFromDb();
        }
      } finally {
        registeringRef.current = false;
      }
    },
    [
      isStudent,
      userId,
      attendeeInfo,
      dbEnabled,
      events,
      registrations,
      applyMutation,
      addNotification,
      syncFromDb,
    ],
  );

  // 5. Schedule-conflict check runs before any seat is booked; it warns but never blocks.
  const requestRegister = useCallback(
    (event: CampusEvent) => {
      if (event.taken < event.capacity) {
        const clash = findScheduleConflict(events, registrations, event.id, userId);
        if (clash) {
          setConflict({ event, clash });
          return;
        }
      }
      void handleRegister(event);
    },
    [events, registrations, userId, handleRegister],
  );

  const openRegisterModal = useCallback(
    (event: CampusEvent) => {
      if (!isStudent) {
        toast.warning(
          "Registrations are made from the Student account — log out and sign in as a student.",
        );
        return;
      }
      setModal({ eventId: event.id, stage: "confirm" });
    },
    [isStudent],
  );

  const handleViewPass = useCallback(
    (event: CampusEvent) => {
      if (!registeredIds.has(event.id)) {
        toast.warning(`No pass found for ${event.title} — register first.`);
        openRegisterModal(event);
        return;
      }
      setModal({ eventId: event.id, stage: "pass" });
    },
    [registeredIds, openRegisterModal],
  );

  // Full event -> "Join Waitlist": same pipeline, it just books a Waitlisted row.
  const handleJoinWaitlist = useCallback(
    (event: CampusEvent) => {
      if (!isStudent) {
        toast.warning(
          "Waitlists are joined from the Student account — log out and sign in as a student.",
        );
        return;
      }
      requestRegister(event);
    },
    [isStudent, requestRegister],
  );

  // 3. Cancel: delete the row, free the seat and auto-promote the earliest waitlisted student.
  const handleCancelRegistration = useCallback(
    async (event: CampusEvent) => {
      if (!isStudent) {
        toast.warning("Only the student can cancel their own registration.");
        return;
      }
      const wasWaitlisted =
        findRegistration(registrations, event.id, userId)?.status === "Waitlisted";
      try {
        const result = dbEnabled
          ? await removeRegistrationRemote(events, registrations, event.id, userId)
          : removeAndPromote(events, registrations, event.id, userId);
        applyMutation(result);
        setModal(null);
        if (wasWaitlisted) {
          addNotification(
            {
              title: `Left waitlist: ${event.title}`,
              body: "You've been removed from the waitlist for this event.",
              time: "Just now",
              kind: "info",
            },
            userId,
          );
          toast.info(`You left the waitlist for ${event.title}.`);
        } else {
          addNotification(
            {
              title: `Registration cancelled: ${event.title}`,
              body:
                result.promoted.length > 0
                  ? "Your seat was released and the next student on the waitlist has been promoted."
                  : "1 seat has been restored to the event's capacity.",
              time: "Just now",
              kind: "alert",
            },
            userId,
          );
          toast.info(`Registration cancelled for ${event.title}. 1 seat restored.`);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't cancel the registration."));
      }
    },
    [isStudent, userId, dbEnabled, events, registrations, applyMutation, addNotification],
  );

  /* ---------------------------------------------------------------- */
  /* Faculty / Admin actions                                          */
  /* ---------------------------------------------------------------- */

  // 3a. Publish: insert into `events`.
  const handlePublish = useCallback(
    async (draft: EventDraft): Promise<PublishOutcome> => {
      if (!hasPermission(role, "publishEvents")) {
        toast.error("Publishing events requires the Faculty or Administrator role.");
        return "failed";
      }
      // Past dates are blocked even if the date input's `min` was bypassed.
      if (isPastEventDate(draft.dateLabel)) {
        toast.error(PAST_EVENT_DATE_MESSAGE);
        return "past_date";
      }
      // Case-insensitive duplicate guard (active events only): nothing is inserted and no card is added.
      if (isDuplicateEventTitle(events, draft.title)) {
        toast.error(DUPLICATE_EVENT_TITLE_MESSAGE);
        return "duplicate";
      }
      try {
        const updatedEvents = dbEnabled
          ? await publishEventRemote(events, draft)
          : publishEvent(events, draft);
        setEvents(updatedEvents);
        addNotification({
          title: `New event published: ${draft.title}`,
          body: `${draft.category} · ${draft.venue} · ${draft.dateLabel}`,
          time: "Just now",
          kind: "info",
        });
        toast.success(`${draft.title} is live on the Discovery grid.`);
        return "published";
      } catch (err) {
        if (err instanceof DuplicateEventTitleError) {
          // Database says the title exists (e.g. published from another tab): show it, add nothing.
          toast.error(DUPLICATE_EVENT_TITLE_MESSAGE);
          await syncFromDb();
          return "duplicate";
        }
        toast.error(`Couldn't publish ${draft.title}: ${getErrorMessage(err)}`);
        return "failed";
      }
    },
    [role, dbEnabled, events, addNotification, syncFromDb],
  );

  // 3b. Emergency cancel (Administrator only): set `cancelled = true` + insert an alert notification.
  const handleEmergencyCancel = useCallback(
    async (event: CampusEvent) => {
      if (!hasPermission(role, "emergencyCancel")) {
        toast.error("Emergency Cancel is available to Administrators only.");
        return;
      }
      try {
        const updatedEvents = dbEnabled
          ? await cancelEventRemote(events, event.id)
          : cancelEvent(events, event.id);
        setEvents(updatedEvents);
        addNotification({
          title: `EMERGENCY: ${event.title} cancelled`,
          body: `${event.dateLabel} at ${event.venue} — broadcast sent to all registered attendees.`,
          time: "Just now",
          kind: "alert",
        });
        toast.error(`${event.title} has been cancelled. Alert broadcast to all attendees.`);
      } catch (err) {
        toast.error(`Couldn't cancel ${event.title}: ${getErrorMessage(err)}`);
      }
    },
    [role, dbEnabled, events, addNotification],
  );

  /** Runs one participant-management operation behind the RBAC check; returns its result or null on failure. */
  const runOrganizerAction = useCallback(
    async <T extends MutationResult>(perform: () => Promise<T> | T): Promise<T | null> => {
      if (!hasPermission(role, "manageParticipants")) {
        toast.error(
          "Participant management requires the Faculty / Club Organizer or Administrator role.",
        );
        return null;
      }
      try {
        const result = await perform();
        applyMutation(result);
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Couldn't update the registration."));
        return null;
      }
    },
    [role, applyMutation],
  );

  // Addressed to the registrant's Enrollment ID, so only that student sees it.
  const notifyRegistrant = useCallback(
    (registration: Registration, title: string, body: string, kind: NotificationItem["kind"]) => {
      addNotification({ title, body, time: "Just now", kind }, registration.enrollmentId);
    },
    [addNotification],
  );

  const handleApprove = useCallback(
    async (event: CampusEvent, registration: Registration) => {
      const result = await runOrganizerAction(() =>
        dbEnabled
          ? setRegistrationStatusRemote(
              events,
              registrations,
              event.id,
              registration.enrollmentId,
              "Approved",
            )
          : changeRegistrationStatus(
              events,
              registrations,
              event.id,
              registration.enrollmentId,
              "Approved",
            ),
      );
      if (!result) return;
      toast.success(`${registration.enrollmentId} approved for ${event.title}.`);
      notifyRegistrant(
        registration,
        `Registration approved: ${event.title}`,
        `Your pass ${registration.ticketId} is now valid.`,
        "info",
      );
    },
    [runOrganizerAction, dbEnabled, events, registrations, notifyRegistrant],
  );

  const handleReject = useCallback(
    async (event: CampusEvent, registration: Registration) => {
      const result = await runOrganizerAction(() =>
        dbEnabled
          ? setRegistrationStatusRemote(
              events,
              registrations,
              event.id,
              registration.enrollmentId,
              "Rejected",
            )
          : changeRegistrationStatus(
              events,
              registrations,
              event.id,
              registration.enrollmentId,
              "Rejected",
            ),
      );
      if (!result) return;
      toast.info(`${registration.enrollmentId} was rejected for ${event.title}.`);
      notifyRegistrant(
        registration,
        `Registration rejected: ${event.title}`,
        "The organizer declined your registration for this event.",
        "alert",
      );
    },
    [runOrganizerAction, dbEnabled, events, registrations, notifyRegistrant],
  );

  const handleRemove = useCallback(
    async (event: CampusEvent, registration: Registration) => {
      const result = await runOrganizerAction(() =>
        dbEnabled
          ? removeRegistrationRemote(events, registrations, event.id, registration.enrollmentId)
          : removeAndPromote(events, registrations, event.id, registration.enrollmentId),
      );
      if (!result) return;
      toast.info(
        result.promoted.length > 0
          ? `${registration.enrollmentId} removed — ${result.promoted[0]!.enrollmentId} promoted from the waitlist.`
          : `${registration.enrollmentId} removed from ${event.title}.`,
      );
      notifyRegistrant(
        registration,
        `Removed from ${event.title}`,
        "An organizer removed your registration for this event.",
        "alert",
      );
    },
    [runOrganizerAction, dbEnabled, events, registrations, notifyRegistrant],
  );

  // 4. Gate check-in toggle (writes checked_in + checked_in_at).
  const handleToggleCheckIn = useCallback(
    async (event: CampusEvent, registration: Registration, checkedIn: boolean) => {
      const result = await runOrganizerAction<MutationResult>(() =>
        dbEnabled
          ? setCheckInRemote(events, event.id, registration.enrollmentId, checkedIn)
          : {
              events,
              registrations: setCheckIn(
                registrations,
                event.id,
                registration.enrollmentId,
                checkedIn,
              ),
              promoted: [],
            },
      );
      if (result) {
        toast.success(
          checkedIn
            ? `${registration.enrollmentId} checked in to ${event.title}.`
            : `Check-in undone for ${registration.enrollmentId}.`,
        );
      }
    },
    [runOrganizerAction, dbEnabled, events, registrations],
  );

  const handleVerifyTicket = useCallback(
    async (event: CampusEvent, ticketId: string): Promise<VerifyResult> => {
      const check = verifyTicket(registrations, event.id, ticketId);
      if (check.kind === "invalid") return { ok: false, message: check.message };
      if (check.kind === "already") return { ok: false, message: check.message };

      const result = await runOrganizerAction<MutationResult>(() =>
        dbEnabled
          ? setCheckInRemote(events, event.id, check.registration.enrollmentId, true)
          : {
              events,
              registrations: setCheckIn(
                registrations,
                event.id,
                check.registration.enrollmentId,
                true,
              ),
              promoted: [],
            },
      );
      if (!result) return { ok: false, message: "Couldn't update the check-in. Please try again." };
      return { ok: true, message: `Checked in: ${check.registration.enrollmentId}.` };
    },
    [registrations, runOrganizerAction, dbEnabled, events],
  );

  // Walk-in / manual attendee: same register-or-waitlist pipeline, no schedule prompt.
  const handleAddAttendee = useCallback(
    async (event: CampusEvent, who: AttendeeInfo) => {
      const outcome = await runOrganizerAction(() =>
        dbEnabled
          ? registerOrWaitlistRemote(events, registrations, event.id, who)
          : registerOrWaitlist(events, registrations, event.id, who),
      );
      if (!outcome) return;
      toast.success(
        outcome.waitlisted
          ? `${who.enrollmentId} added to the waitlist — Waitlist #${outcome.position}.`
          : `${who.enrollmentId} registered for ${event.title}.`,
      );
      notifyRegistrant(
        outcome.registration,
        outcome.waitlisted
          ? `Waitlist joined: ${event.title}`
          : `Gate pass issued for ${event.title}`,
        outcome.waitlisted
          ? `An organizer added you — Waitlist #${outcome.position}.`
          : `An organizer registered you. Ticket ${outcome.registration.ticketId}.`,
        "info",
      );
    },
    [runOrganizerAction, dbEnabled, events, registrations, notifyRegistrant],
  );

  // 6. Mark as read: update `unread = false` in `notifications`.
  const markAllRead = useCallback(() => {
    if (!notifications.some((n) => n.unread)) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (dbEnabled) {
      markAllNotificationsRead().catch((err) => {
        console.error("Could not mark notifications read", err);
        toast.error("Couldn't save read status to the database.");
      });
    }
  }, [dbEnabled, notifications]);

  const handleTabChange = useCallback(
    (tab: TabName) => {
      setActiveTab(tab);
      if (tab === "My Passes & Alerts") markAllRead();
    },
    [markAllRead],
  );

  // TC01: LoginScreen only calls this after the ID and password were validated.
  const handleSignIn = useCallback((profile: SessionProfile) => {
    writeSession(profile);
    setSession(profile);
    setModal(null);
    setConflict(null);
    setActiveTab("Discovery & Events");
    toast.success(`Signed in as ${profile.displayName}.`);
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    setModal(null);
    setConflict(null);
    setActiveTab("Discovery & Events");
    setSearchQuery("");
    setCategory("All Events");
    toast.success("Signed out successfully");
  }, []);

  const shellClass = `min-h-screen text-foreground ${
    theme === "dark" ? "dark bg-background" : "bg-[#E6E4EE]"
  }`;
  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  // Wait for the sessionStorage check so a signed-in refresh never flashes the login page.
  if (!authChecked) return <div className={shellClass} aria-hidden />;

  if (!session) {
    return (
      <div className={shellClass}>
        <LoginScreen theme={theme} onThemeToggle={toggleTheme} onSignIn={handleSignIn} />
      </div>
    );
  }

  const modalEvent = modal ? events.find((e) => e.id === modal.eventId) : undefined;
  const modalPass = modal ? approvedPasses.find((p) => p.eventId === modal.eventId) : undefined;

  return (
    <div
      className={`min-h-screen pb-20 text-foreground ${
        theme === "dark" ? "dark bg-background" : "bg-[#E6E4EE]"
      }`}
    >
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={unreadCount}
        passesCount={approvedPasses.length}
        notifications={visibleNotifications}
        onMarkAllRead={markAllRead}
        theme={theme}
        onThemeToggle={toggleTheme}
        session={session}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {loading && (
          <div
            role="status"
            aria-label="Loading campus events"
            className="h-[28rem] animate-pulse rounded-2xl border border-slate-300/80 bg-card shadow-md dark:border-portal-hairline"
          />
        )}
        {!loading && activeTab === "Discovery & Events" && (
          <DiscoveryTab
            events={events}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            category={category}
            onCategoryChange={setCategory}
            registeredIds={registeredIds}
            onRegister={openRegisterModal}
            onViewPass={handleViewPass}
            onJoinWaitlist={handleJoinWaitlist}
          />
        )}
        {!loading && activeTab === "Organizer Hub" && (
          <OrganizerHub
            session={session}
            events={events}
            registrations={registrations}
            onLogout={handleLogout}
            onPublish={handlePublish}
            onEmergencyCancel={handleEmergencyCancel}
            onApprove={handleApprove}
            onReject={handleReject}
            onRemove={handleRemove}
            onToggleCheckIn={handleToggleCheckIn}
            onVerifyTicket={handleVerifyTicket}
            onAddAttendee={handleAddAttendee}
          />
        )}
        {!loading && activeTab === "Campus Calendar" && (
          <CampusCalendar
            events={events}
            registeredIds={registeredIds}
            onRegister={openRegisterModal}
            onViewPass={handleViewPass}
            onJoinWaitlist={handleJoinWaitlist}
          />
        )}
        {!loading && activeTab === "My Passes & Alerts" && (
          <PassesAlerts
            enrollmentId={userId}
            passes={myRegistrations}
            events={events}
            notifications={visibleNotifications}
            waitlistPositions={myWaitlistPositions}
            onCancelRegistration={handleCancelRegistration}
            readOnly={!isStudent}
          />
        )}
      </main>

      {modalEvent && modal && (
        <RegisterModal
          event={modalEvent}
          stage={modal.stage}
          enrollmentId={userId}
          initials={session.initials}
          ticketId={modalPass?.ticketId ?? makeAttendeeTicketId(modalEvent, userId)}
          checkedIn={modalPass?.checkedIn ?? false}
          onClose={() => setModal(null)}
          onConfirm={() => requestRegister(modalEvent)}
        />
      )}

      {conflict && (
        <ScheduleConflictDialog
          event={conflict.event}
          clash={conflict.clash}
          onCancel={() => setConflict(null)}
          onProceed={() => {
            const target = conflict.event;
            setConflict(null);
            void handleRegister(target);
          }}
        />
      )}
    </div>
  );
}

/** Non-blocking warning: the student may still register despite the clash. */
function ScheduleConflictDialog({
  event,
  clash,
  onCancel,
  onProceed,
}: {
  event: CampusEvent;
  clash: CampusEvent;
  onCancel: () => void;
  onProceed: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="schedule-conflict-title"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-portal-regal/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-portal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 bg-portal-gold-soft px-6 py-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-portal-gold text-white">
            <CalendarClock className="size-5" aria-hidden />
          </span>
          <div>
            <h2
              id="schedule-conflict-title"
              className="font-display text-lg font-bold text-portal-regal"
            >
              Schedule clash detected
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-portal-gold-text">{event.dateLabel}</p>
          </div>
        </div>
        <div className="space-y-3 px-6 py-5 text-sm text-muted-foreground">
          <p>
            You already hold an Approved pass for{" "}
            <span className="font-bold text-foreground">{clash.title}</span> at the same date and
            time ({clash.venue}).
          </p>
          <p>
            You can still register for{" "}
            <span className="font-bold text-foreground">{event.title}</span>, but you may not be
            able to attend both.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-portal-hairline bg-card py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={onProceed}
              className="flex-1 rounded-lg bg-portal-gold py-2.5 text-sm font-bold text-white shadow-gold transition-colors hover:bg-portal-gold/90"
            >
              Register Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}