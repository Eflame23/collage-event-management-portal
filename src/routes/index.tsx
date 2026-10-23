import { createFileRoute } from "@tanstack/react-router";
import { PortalApp } from "@/components/portal/PortalApp";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MIT-ADT Campus Event Portal" },
      {
        name: "description",
        content:
          "Discover, register and participate in MIT-ADT University School of Computing events with digital gate passes, a dynamic campus calendar and organizer tools.",
      },
      { property: "og:title", content: "MIT-ADT Campus Event Portal" },
      {
        property: "og:description",
        content: "Discover. Register. Participate. — Make Every Moment Count at MIT-ADT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  return <PortalApp />;
}
