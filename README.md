College Event Management Portal

Agile Transformation – Final Jury Project

📌 Project Overview

The College Event Management Portal is a centralized platform designed to simplify how college events are created, announced, discovered, and managed. It provides a common platform for students to explore upcoming events and register for them, while organizers can create events, update event details, and manage participant registrations.

The portal aims to replace scattered event announcements and manual registration processes with a more organized, efficient, and accessible system.

---

🎯 Problem Statement

Currently, college event information and registrations are often distributed across multiple channels, making it difficult for students to discover events and for organizers to maintain participant records.

The proposed system addresses the following problems:

- Students struggle to discover college events.
- Event announcements and registration details are scattered across different channels.
- Organizers lack a centralized platform for managing participants.
- Manual registration makes tracking participants and event capacity difficult.

---

🎯 Objectives

- Centralize college event creation, announcements, and discovery.
- Allow students to browse events and view event details.
- Enable students to register for college events.
- Allow organizers to create, update, and manage events.
- Provide organizers with a centralized view of registrations.
- Implement role-based access for students and organizers.
- Manage event capacity and prevent duplicate registrations.
- Provide registration confirmations and notifications.

---

👥 User Roles

1. Student

Students can:

- Browse available college events.
- Search for events.
- View event details, dates, venues, and descriptions.
- Register for events.
- Receive registration confirmation and notifications.

2. Organizer

Organizers can:

- Create new events.
- Update event information.
- Manage event details and capacity.
- View registered participants.
- Track registrations for their events.

---

✨ Key Features

- Role-Based Access: Separate functionality for students and organizers.
- Event Listing: View upcoming and available college events.
- Event Search: Search for events based on relevant information.
- Event Details: View descriptions, date, venue, and other event details.
- Event Creation: Organizers can create new events.
- Event Management: Organizers can update and manage existing events.
- Student Registration: Students can register for events.
- Registration Management: Organizers can view participant registrations.
- Capacity Management: Manage event participant limits.
- Duplicate Registration Prevention: Prevent students from registering multiple times for the same event.
- Notifications: Provide registration confirmations and event-related updates.

---

🔄 Application Workflow

Student Workflow

1. Login to the portal as a student.
2. Browse available college events.
3. Search for a specific event.
4. Open event details.
5. Register for the selected event.
6. Receive registration confirmation.

Organizer Workflow

1. Login to the portal as an organizer.
2. Access the organizer dashboard.
3. Create a new event.
4. Update event information when required.
5. View registered participants.
6. Manage registrations and event capacity.

---

🛠️ Technology Stack

«Update this section according to the technologies actually used in your project.»

Component| Technology
Frontend| [Add frontend technology]
Backend| [Add backend technology]
Database| [Add database]
Development Tools| [Add tools used]
Version Control| Git & GitHub
Agile Management| Jira / Trello

---

🏗️ System Modules

1. Student Modules

Handles student-side event discovery, searching, event details, and registration.

2. Organizer Module

Allows organizers to create, update, and manage college events.

3. Event Management Module

Handles event information, schedules, venues, descriptions, and capacity.

4. Registration Module

Manages student registrations, registration records, confirmation, and duplicate prevention.

5. Notification Module

Provides registration confirmations and event-related notifications.

6. Authentication & Authorization Module

Handles user authentication and role-based access for students and organizers.

---

🧪 Testing

The application is tested using positive, negative, and boundary test cases to verify the correctness of its functionalities.

Test Case| Scenario| Expected Result
TC01| Student views available events| Events are displayed successfully
TC02| Student registers for an event| Registration is successful and confirmation is displayed
TC03| Student registers for the same event twice| Duplicate registration is prevented
TC04| Student tries to register for a full event| Registration is rejected with an appropriate message
TC05| Organizer creates an event with valid details| Event is created successfully
TC06| Organizer submits incomplete event details| Validation error is displayed
TC07| Unauthorized user attempts organizer functionality| Access is restricted

«Test cases are executed before the final demonstration to verify functionality, validation, and error handling.»

---

📋 Agile Methodology

The project follows the Agile approach to development, focusing on iterative development, task prioritization, collaboration, feedback, and continuous improvement.

Agile Practices Followed

- Product Backlog creation.
- User Story development.
- Acceptance Criteria definition.
- Sprint Planning.
- Sprint Backlog management.
- Task allocation among team members.
- Sprint progress tracking.
- Continuous integration of modules.
- Testing and feedback-based improvements.

Agile Artefacts

- Product Backlog
- User Stories
- Acceptance Criteria
- Sprint Plan
- Sprint Backlog
- Definition of Done (DoD)
- Task Allocation
- Sprint Progress Tracking
- Jira/Trello Board

---

📖 Sample User Stories

Student – Event Discovery

User Story:
As a student, I want to browse available college events so that I can discover events that interest me.

Acceptance Criteria:

- Events should be displayed with relevant details.
- Students should be able to search for events.
- Students should be able to view complete event information.

Student – Event Registration

User Story:
As a student, I want to register for an event so that I can participate in it.

Acceptance Criteria:

- Registration should be allowed for available events.
- Duplicate registration should be prevented.
- Registration should not exceed event capacity.
- Successful registration should provide confirmation.

Organizer – Event Creation

User Story:
As an organizer, I want to create an event so that students can discover and register for it.

Acceptance Criteria:

- Required event information must be provided.
- Events should be created successfully with valid inputs.
- Newly created events should appear in the event listing.

Organizer – Registration Management

User Story:
As an organizer, I want to view registered participants so that I can manage event attendance.

Acceptance Criteria:

- Registered participants should be visible to the organizer.
- Registration information should be associated with the correct event.
- Participant information should be displayed accurately.

---

👨‍💻 Team Contributions

Team Member| Responsibility| Contribution
Ikhlas Nadaf| Frontend Development & Student Interface| Event listing, search, event details, navigation, and UI integration
Pranjali Jagtap| Backend Development & Database Management| Backend logic, database design, event and registration data handling
Eshan Manoj| Event Creation & Organizer Module| Event creation, event updates, organizer dashboard and registration viewing
Maviya Sayyed| Student Registration & Validation| Student registration, confirmation, capacity checks and duplicate prevention
Samiksha Sawant| Role-Based Access, Notifications & Agile Management| Access control, notifications, Agile artefacts, sprint planning and integration coordination

---

🚀 Expected Outcomes

- Centralized college event management.
- Improved event discoverability for students.
- Simplified event registration.
- Better participant management for organizers.
- Reduced manual work and scattered registrations.
- Improved communication through event notifications.
- More organized and efficient event management.

---

🔮 Future Scope

- Email and SMS notifications.
- QR-based event attendance.
- Event check-in and attendance tracking.
- Personalized event recommendations.
- Analytics and event participation reports.
- Integration with the college student portal.
- Mobile application support.

---

📂 Project Repository

This repository contains the source code, application modules, project documentation, testing information, and Agile development artefacts associated with the College Event Management Portal.

---

👨‍🎓 Project Information

Project Title: College Event Management Portal – Agile Transformation
Domain: College Event Management
Methodology: Agile Development
Project Type: Academic Team Project
Institution: MIT Art, Design and Technology University

---

📜 Disclaimer

This project is developed for academic purposes as part of the Agile Software Development course. Any sample data, simulated notifications, or demonstration functionalities are used for project evaluation and testing purposes.
