import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type CampusEvent,
  type EventDraft,
  type GatePass,
  type NotificationItem,
  INITIAL_EVENTS,
  INITIAL_NOTIFICATIONS,
  STUDENT,
} from "./data";
import {
  cancelEvent,
  cancelRegistration,
  makeTicketId,
  publishEvent,
  registerForEvent,
} from "./portal-logic";
import { Header, type TabName } from "./Header";
import { DiscoveryTab } from "./DiscoveryTab";
import { OrganizerHub } from "./OrganizerHub";
import { SprintMetrics } from "./SprintMetrics";
import { PassesAlerts } from "./PassesAlerts";
import { RegisterModal } from "./RegisterModal";
import { DevOpsFooter } from "./DevOpsFooter";

interface ModalState {
  eventId: string;
  stage: "confirm" | "pass";
}

export function PortalApp() {
  const [events, setEvents] = useState<CampusEvent[]>(INITIAL_EVENTS);
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<TabName>("Discovery & Events");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("All Events");
  const [modal, setModal] = useState<ModalState | null>(null);

  const registeredIds = useMemo(() => new Set(passes.map((p) => p.eventId)), [passes]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const addNotification = useCallback((item: Omit<NotificationItem, "id" | "unread">) => {
    setNotifications((prev) => [
      { ...item, id: `ntf-${Date.now()}`, unread: true },
      ...prev,
    ]);
  }, []);

  const handleRegister = useCallback(
    (event: CampusEvent) => {
      try {
        const result = registerForEvent(events, passes, event.id, STUDENT.name, STUDENT.division);
        setEvents(result.events);
        setPasses((prev) => [...prev, result.pass]);
        setModal({ eventId: event.id, stage: "pass" });
        addNotification({
          title: `Gate pass issued for ${event.title}`,
          body: `Ticket ${result.pass.ticketId} — 1 seat booked. Check My Passes & Alerts.`,
          time: "Just now",
          kind: "info",
        });
        toast.success(`Registered for ${event.title}! Your digital gate pass is ready.`);
      } catch (err) {
        toast.warning(err instanceof Error ? err.message : "Registration failed.");
      }
    },
    [events, passes, addNotification]
  );

  const handleViewPass = useCallback(
    (event: CampusEvent) => {
      if (!registeredIds.has(event.id)) {
        toast.warning(`No pass found for ${event.title} — register first.`);
        setModal({ eventId: event.id, stage: "confirm" });
        return;
      }
      setModal({ eventId: event.id, stage: "pass" });
    },
    [registeredIds]
  );

  const handleJoinWaitlist = useCallback(
    (event: CampusEvent) => {
      toast.info(`Added to waitlist for ${event.title} — we'll alert you if a seat opens up.`);
      addNotification({
        title: `Waitlist joined: ${event.title}`,
        body: "You'll receive an alert the moment a seat is released.",
        time: "Just now",
        kind: "info",
      });
    },
    [addNotification]
  );

  const handleCancelRegistration = useCallback(
    (event: CampusEvent) => {
      const { events: updatedEvents, passes: updatedPasses } = cancelRegistration(
        events,
        passes,
        event.id
      );
      setEvents(updatedEvents);
      setPasses(updatedPasses);
      setModal(null);
      addNotification({
        title: `Registration cancelled: ${event.title}`,
        body: "1 seat has been restored to the event's capacity.",
        time: "Just now",
        kind: "alert",
      });
      toast.info(`Registration cancelled for ${event.title}. 1 seat restored.`);
    },
    [events, passes, addNotification]
  );

  const handlePublish = useCallback(
    (draft: EventDraft) => {
      setEvents((prev) => publishEvent(prev, draft));
      addNotification({
        title: `New event published: ${draft.title}`,
        body: `${draft.category} · ${draft.venue} · ${draft.dateLabel}`,
        time: "Just now",
        kind: "info",
      });
      toast.success(`${draft.title} is live on the Discovery grid.`);
    },
    [addNotification]
  );

  const handleEmergencyCancel = useCallback(
    (event: CampusEvent) => {
      setEvents((prev) => cancelEvent(prev, event.id));
      addNotification({
        title: `EMERGENCY: ${event.title} cancelled`,
        body: `${event.dateLabel} at ${event.venue} — broadcast sent to all registered attendees.`,
        time: "Just now",
        kind: "alert",
      });
      toast.error(`${event.title} has been cancelled. Alert broadcast to all attendees.`);
    },
    [addNotification]
  );

  const handleTabChange = useCallback((tab: TabName) => {
    setActiveTab(tab);
    if (tab === "My Passes & Alerts") {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    }
  }, []);

  const modalEvent = modal ? events.find((e) => e.id === modal.eventId) : undefined;

  return (
    <div className="min-h-screen pb-20">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadCount={unreadCount}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === "Discovery & Events" && (
          <DiscoveryTab
            events={events}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            category={category}
            onCategoryChange={setCategory}
            registeredIds={registeredIds}
            onRegister={(event) => setModal({ eventId: event.id, stage: "confirm" })}
            onViewPass={handleViewPass}
            onJoinWaitlist={handleJoinWaitlist}
          />
        )}
        {activeTab === "Organizer Hub" && (
          <OrganizerHub events={events} onPublish={handlePublish} onEmergencyCancel={handleEmergencyCancel} />
        )}
        {activeTab === "Sprint Metrics" && <SprintMetrics />}
        {activeTab === "My Passes & Alerts" && (
          <PassesAlerts
            passes={passes}
            events={events}
            notifications={notifications}
            onCancelRegistration={handleCancelRegistration}
          />
        )}
      </main>

      {modalEvent && modal && (
        <RegisterModal
          event={modalEvent}
          stage={modal.stage}
          ticketId={makeTicketId(modalEvent)}
          onClose={() => setModal(null)}
          onConfirm={() => handleRegister(modalEvent)}
        />
      )}

      <DevOpsFooter />
    </div>
  );
}
