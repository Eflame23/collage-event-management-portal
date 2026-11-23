MIT-ADT Campus Event Management Portal
A full-stack, role-based campus event discovery, registration, and organizer management platform built for MIT-ADT University, Pune under Program Elective-I: Agile Software Development (23CSE3012).
---
Live Architecture & Tech Stack
Layer	Technology	Purpose
Frontend & UI	React 18, TypeScript, Tailwind CSS, Shadcn UI, Lucide Icons	Component-driven, type-safe, mobile-responsive interface with MIT-ADT plum (`#360D3A`) & gold (`#B8860B`) theming and light/dark mode
Routing & Build	TanStack Start / Router, Vite	Fast client-side transitions, SSR compatibility, and optimized production bundling
Backend & Database	Supabase (PostgreSQL)	Relational persistence for `events`, `registrations`, and `notifications` with Foreign Key integrity and database-level `UNIQUE` constraints
Authentication & RBAC	Dynamic Role-Based Access Control (`sessionStorage`)	Three-role session isolation (Student, Faculty, Administrator) keyed dynamically by Enrollment / Employee / Admin ID
DevOps & Hosting	Git, GitHub, Vercel	Automated CI/CD deployment pipeline on every push to `main`
---
Core Features
1. Dynamic Role-Based Authentication (`LoginScreen.tsx` & `Header.tsx`)
Three-Role Access Control: Supports Student, Faculty, and Administrator login tabs with dynamic ID-based session mapping (`sessionStorage`).
Per-Enrollment Session Isolation: Any valid Student Enrollment ID (e.g., `ADT24SOCB0621`) initializes an isolated session that tracks passes, waitlists, and alerts strictly under that ID.
Validation Guard (`TC01` & `TC02`): Enforces minimum ID formatting and authorized portal PIN (`696969`) before granting access.
2. Event Discovery & Campus Calendar (`DiscoveryTab.tsx` & `CampusCalendar.tsx`)
Multi-Category Filtering & Live Search: Filter campus events across `Technical`, `Cultural`, `Workshops`, and `Competitions` or search in real time by title, code, or venue.
Interactive Campus Calendar: Monthly grid view with clickable mini-event cards, live capacity indicators, and one-click `.ics` calendar file downloads.
3. Student Registration, Digital Passes & Waitlist Engine (`RegisterModal.tsx` & `PassesAlerts.tsx`)
Instant Seat Booking & QR Gate Passes: Generates unique ticket IDs (`MIT-ADT-2025-<CODE>-<ENROLLMENT_ID>`) with scannable QR codes.
Database-Level Duplicate Prevention (`TC06` / `BUG-01`): Enforces `UNIQUE(event_id, enrollment_id)` in PostgreSQL alongside UI validation so a student cannot double-book the same event.
Smart Waitlist Auto-Promotion: When an event reaches capacity, additional registrations enter `Waitlisted` status and automatically promote in FIFO order if a confirmed participant cancels.
Schedule Conflict Detection: Warns students before booking events that overlap in date/time.
