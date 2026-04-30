# CRM Project Setup And Layout User Stories

## Document Purpose

This document defines the initial user stories for building a CRM platform foundation using the same application style as this project.

Scope of this document:
- project initialization
- engineering foundation
- dashboard shell
- sidebar setup
- layout design
- responsive behavior
- navigation experience

Out of scope:
- CRM entities and data models
- lead, customer, deal, invoice, or task workflows
- reports, AI features, and business rules

---

## Package Baseline Reference

The CRM project setup should follow the same package baseline pattern used in the current
[package.json](../package.json).

### Core runtime and framework
- `next`
- `react`
- `react-dom`
- `typescript`

### Styling and UI foundation
- `tailwindcss`
- `@tailwindcss/postcss`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `lucide-react`
- `sonner`
- `next-themes`

### Radix-based UI primitives
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-select`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-popover`
- `@radix-ui/react-alert-dialog`
- additional Radix primitives as needed for the dashboard shell

### Forms, validation, and state handling
- `react-hook-form`
- `@hookform/resolvers`
- `zod`
- `@tanstack/react-query`
- `@tanstack/react-table`
- `nuqs`

### Authentication and data layer
- `better-auth`
- `drizzle-orm`
- `drizzle-kit`
- `@neondatabase/serverless`
- `dotenv`

### Realtime and infrastructure-ready packages
- `socket.io`
- `socket.io-client`
- `ioredis`
- `@socket.io/redis-adapter`
- `@socket.io/redis-emitter`

### Utility and platform support
- `nanoid`
- `date-fns`
- `react-error-boundary`
- `tsx`
- `eslint`
- `eslint-config-next`

### Optional packages to keep only if CRM scope needs them
- `recharts` for dashboards
- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` for file storage
- `vaul` for drawer-style mobile UX
- `cmdk` for command palette behavior

### Script baseline from package.json
- `clean:next`
- `dev`
- `dev:server`
- `build`
- `start`
- `lint`
- `perf:smoke`
- `db:push`
- `db:studio`
- targeted `db:fix:*` scripts for safe schema patches when needed

---

## Epic 1: Project Initialization And Engineering Foundation

### Story CRM-SETUP-001: Initialize the CRM project foundation
**As a** product owner  
**I want** the CRM project to be initialized with a production-ready frontend and backend application structure  
**So that** the team can build new modules on a stable foundation instead of repeatedly reworking the base setup.

**Acceptance Criteria**
- The project is created with a modern app framework and typed codebase.
- The project setup aligns with the current `package.json` baseline built around Next.js, React, TypeScript, and Tailwind.
- The project includes a clear `src/` based structure for app, modules, components, lib, and db.
- The project supports local development, production build, and local production start commands.
- The project includes shared alias imports for maintainable module organization.
- The project includes linting and consistent environment file conventions.

### Story CRM-SETUP-002: Establish a reusable module-based architecture
**As a** development team  
**I want** the codebase to follow a module-first structure  
**So that** CRM features can be added independently without turning the project into a monolith.

**Acceptance Criteria**
- Each major feature area has a dedicated module folder.
- Shared UI components are separated from feature-specific UI.
- Shared utilities, types, and infrastructure code are separated from business modules.
- Route files and UI logic are organized in a predictable way.
- The structure supports future scaling without major refactoring.
- The structure supports the dependency categories defined in the `package.json` baseline without mixing infrastructure and feature concerns.

### Story CRM-SETUP-003: Define environment and runtime setup
**As a** developer  
**I want** a standardized environment configuration template  
**So that** every engineer can run the CRM system consistently in local, staging, and production environments.

**Acceptance Criteria**
- A sample environment file is available.
- Required runtime variables are documented by category.
- The project supports local startup with minimum required configuration.
- The setup distinguishes optional services from mandatory services.
- Missing configuration produces understandable developer feedback.
- Environment setup covers the runtime expectations introduced by the current `package.json`, including database, auth, logging, and optional realtime services.

### Story CRM-SETUP-004: Provide standard developer scripts
**As a** developer  
**I want** standard project scripts for setup, development, linting, and build  
**So that** daily engineering tasks are fast and consistent across the team.

**Acceptance Criteria**
- Scripts exist for local development.
- Scripts exist for production build and start.
- Scripts exist for linting.
- Scripts exist for database sync or schema push if the project includes persistence.
- Script names are clear and consistent with project conventions.
- The initial CRM project includes script patterns equivalent to `clean:next`, `dev`, `dev:server`, `build`, `start`, `lint`, `db:push`, and `db:studio`.

### Story CRM-SETUP-005: Prepare the application for future realtime and integrations
**As a** system architect  
**I want** the CRM foundation to be compatible with realtime notifications and external integrations  
**So that** future features can be added without redesigning the application shell.

**Acceptance Criteria**
- The application can run with either standard framework runtime or custom server runtime when needed.
- The architecture allows optional integration of notification, queue, cache, or websocket services.
- Optional infrastructure does not block core local development.
- The project foundation does not hard-code business-specific integrations into the shell.
- Realtime readiness is aligned with the infrastructure-oriented packages already present in the current `package.json`, especially Socket.IO and Redis-related packages.

---

## Epic 2: Dashboard Application Shell

### Story CRM-LAYOUT-001: Build a protected dashboard shell
**As a** signed-in CRM user  
**I want** all business screens to open inside a consistent dashboard shell  
**So that** the product feels unified and I always know where navigation and actions are located.

**Acceptance Criteria**
- Authenticated screens are rendered inside a dashboard layout wrapper.
- Unauthenticated users are redirected away from protected dashboard routes.
- The shell includes sidebar, top navigation, and main content area.
- The shell supports shared gates such as onboarding, subscription, or access checks.

### Story CRM-LAYOUT-002: Design a reusable main content container
**As a** user  
**I want** dashboard pages to follow a consistent content spacing and width system  
**So that** every CRM screen feels visually aligned and easier to scan.

**Acceptance Criteria**
- Page content uses a standard padding system.
- Main content area supports both full-width and constrained layouts where needed.
- Layout spacing remains consistent across desktop and tablet breakpoints.
- New screens can plug into the shell without redefining base spacing rules.

### Story CRM-LAYOUT-003: Include a reusable top navigation bar
**As a** CRM user  
**I want** a persistent top bar for context, quick actions, and account controls  
**So that** I can navigate and manage my workspace efficiently from any screen.

**Acceptance Criteria**
- The top bar appears consistently across dashboard routes.
- The top bar supports page context such as breadcrumbs or screen title.
- The top bar supports user account actions.
- The top bar leaves room for future quick search, notifications, and command actions.

### Story CRM-LAYOUT-004: Support global loading and access states in the shell
**As a** user  
**I want** the dashboard shell to handle startup, access, and readiness states clearly  
**So that** I understand what the application is doing instead of seeing broken or blank screens.

**Acceptance Criteria**
- The shell can display a loading state while the user workspace initializes.
- The shell can display an access-restricted state.
- The shell can display a setup-required state.
- The shell can display a temporary system-unavailable message if required services are down.

---

## Epic 3: Sidebar Navigation Setup

### Story CRM-SIDEBAR-001: Create a persistent left sidebar navigation
**As a** CRM user  
**I want** a persistent sidebar for navigating the platform  
**So that** I can move between core CRM areas quickly without losing context.

**Acceptance Criteria**
- The sidebar is visible on desktop dashboard screens.
- The sidebar includes brand area, primary navigation, secondary links, and user area.
- The sidebar remains consistent across all protected routes.
- The sidebar supports long-term expansion as more CRM modules are introduced.

### Story CRM-SIDEBAR-002: Organize the sidebar by navigation groups
**As a** CRM user  
**I want** the sidebar menu to be grouped into logical sections  
**So that** I can understand the product structure without memorizing routes.

**Acceptance Criteria**
- Navigation items are grouped by function rather than listed as one flat menu.
- Group labels are clear and stable.
- The information architecture supports future module growth.
- Primary business screens are easy to discover from the default sidebar state.

### Story CRM-SIDEBAR-003: Show active and current navigation state
**As a** CRM user  
**I want** the sidebar to clearly indicate my current location  
**So that** I do not get lost while moving across CRM screens.

**Acceptance Criteria**
- The active screen is visually highlighted.
- Parent groups show open or active state when a child route is selected.
- Navigation feedback works for nested routes.
- The active state remains accurate after direct URL navigation or refresh.

### Story CRM-SIDEBAR-004: Support role-aware and privilege-aware sidebar visibility
**As a** company administrator  
**I want** the sidebar to show only the navigation relevant to a user’s role and permissions  
**So that** users are not confused by screens they cannot access.

**Acceptance Criteria**
- Sidebar groups can be hidden based on access rules.
- Sidebar items can be hidden based on access rules.
- Users never see dead-end links to restricted screens.
- Admin-only navigation can be supported without impacting standard users.

### Story CRM-SIDEBAR-005: Support secondary utility navigation
**As a** CRM user  
**I want** non-core links such as support, bin, feedback, and profile actions to be separated from business navigation  
**So that** the main workspace stays focused while utilities remain available.

**Acceptance Criteria**
- Secondary navigation is visually separated from main navigation.
- Utility items do not compete with primary business screens.
- The sidebar footer includes the current user context and account access.

### Story CRM-SIDEBAR-006: Support collapsible sidebar behavior
**As a** frequent CRM user  
**I want** the sidebar to collapse or compress when needed  
**So that** I can maximize screen space for dense business workflows.

**Acceptance Criteria**
- The sidebar supports expanded and collapsed states on desktop.
- Collapsed state still preserves recognizability through icons or compact cues.
- Content layout responds correctly when the sidebar width changes.
- The interaction does not break page alignment or responsiveness.

### Story CRM-SIDEBAR-007: Support mobile sidebar access
**As a** mobile or tablet user  
**I want** the sidebar to open in a mobile-friendly pattern  
**So that** navigation remains usable on smaller screens.

**Acceptance Criteria**
- On smaller screens the sidebar is replaced by an overlay, drawer, or sheet behavior.
- The mobile navigation is easy to open and dismiss.
- The mobile navigation does not block the main content after selection.
- Navigation remains keyboard and touch friendly.

---

## Epic 4: Layout Design System For CRM Screens

### Story CRM-DESIGN-001: Define a standard dashboard page layout pattern
**As a** designer and developer  
**I want** all CRM pages to follow a shared page composition pattern  
**So that** each new feature can be delivered faster with a familiar UX structure.

**Acceptance Criteria**
- Pages can follow a standard structure such as header, actions, filters, body, and supporting panels.
- Shared layout patterns can be reused across list, detail, and settings screens.
- The design supports both simple and dense enterprise pages.

### Story CRM-DESIGN-002: Support list and detail workspace layouts
**As a** CRM user  
**I want** the dashboard layout to support both management lists and deeper detail screens  
**So that** the CRM can handle both overview work and focused record work.

**Acceptance Criteria**
- The layout supports index/list screens.
- The layout supports single-record management screens.
- The layout supports split or panel-based workspaces where appropriate.
- Layout transitions between screen types remain visually consistent.

### Story CRM-DESIGN-003: Provide responsive page regions
**As a** CRM user  
**I want** the page layout to adapt cleanly across desktop, laptop, tablet, and mobile sizes  
**So that** I can use the product reliably on different devices.

**Acceptance Criteria**
- Header, filters, panels, and actions reflow without overlap.
- Dense tables or panels degrade gracefully on smaller screens.
- Horizontal overflow is controlled intentionally.
- Critical navigation and actions remain reachable on smaller viewports.

### Story CRM-DESIGN-004: Standardize empty, loading, and error visual patterns
**As a** user  
**I want** empty and system states to look consistent across layouts  
**So that** the product feels coherent even before feature data is introduced.

**Acceptance Criteria**
- Shared empty-state layout pattern exists.
- Shared loading-state layout pattern exists.
- Shared error-state layout pattern exists.
- These patterns can be reused without each module inventing its own structure.

### Story CRM-DESIGN-005: Reserve layout space for future global tools
**As a** product owner  
**I want** the app shell to be ready for future command search, notifications, and contextual help  
**So that** the product can evolve without redesigning the shell later.

**Acceptance Criteria**
- The top navigation can support future global actions.
- The sidebar can support future badges or counters.
- The shell can support page-level help or banners.
- The layout does not assume a fixed minimal feature set.

---

## Epic 5: Navigation And Screen Experience

### Story CRM-NAV-001: Preserve consistent navigation behavior across all modules
**As a** CRM user  
**I want** navigation behavior to feel the same in every module  
**So that** I do not need to relearn the interface when new areas are added.

**Acceptance Criteria**
- Navigation interaction patterns are consistent across modules.
- Visual hierarchy is stable across different sections.
- The app shell does not change unexpectedly between routes.

### Story CRM-NAV-002: Support breadcrumb or page context visibility
**As a** CRM user  
**I want** the layout to show where I am inside the product structure  
**So that** I can understand the relationship between list screens, detail screens, and settings areas.

**Acceptance Criteria**
- The top area can display page title and context.
- The layout supports breadcrumb-style context where useful.
- Deep screens can expose parent-child relationships without custom one-off layout logic.

### Story CRM-NAV-003: Support command-based navigation in the shell
**As a** power user  
**I want** a fast command-style navigation entry point  
**So that** I can jump across the CRM without relying only on the sidebar.

**Acceptance Criteria**
- The shell can support a command launcher or quick navigation action.
- Command navigation respects the same access rules as sidebar navigation.
- The feature can be added without redesigning the main shell.

---

## Non-Functional User Stories

### Story CRM-NFR-001: Accessibility-ready shell and navigation
**As a** user with accessibility needs  
**I want** the project layout and sidebar to be keyboard-friendly and understandable to assistive tools  
**So that** I can use the CRM without accessibility blockers.

**Acceptance Criteria**
- Sidebar navigation is keyboard reachable.
- Focus states are visible.
- Landmark regions and labels can be applied in the shell.
- Responsive navigation remains accessible on mobile and desktop.

### Story CRM-NFR-002: Performance-aware shell rendering
**As a** CRM user  
**I want** the base layout to load quickly and remain responsive  
**So that** the workspace feels reliable before feature complexity grows.

**Acceptance Criteria**
- Shell-level rendering avoids unnecessary blocking patterns.
- Shared layout components are reusable and lightweight.
- Layout-level loading behavior does not cause excessive visual shift.

### Story CRM-NFR-003: Maintainable design foundation
**As a** development team  
**I want** the layout system to be implemented with reusable primitives and conventions  
**So that** new modules can follow the same UX rules without duplicating layout logic.

**Acceptance Criteria**
- Shared layout primitives are reusable.
- Sidebar and shell logic are centralized.
- New feature teams can adopt the design pattern with minimal onboarding.

---

## Recommended Delivery Order

1. Epic 1: Project Initialization And Engineering Foundation  
2. Epic 2: Dashboard Application Shell  
3. Epic 3: Sidebar Navigation Setup  
4. Epic 4: Layout Design System For CRM Screens  
5. Epic 5: Navigation And Screen Experience  
6. Non-Functional User Stories

---

## Notes

- These stories are intentionally platform-level stories, not CRM business stories.
- They should be completed before detailed module stories such as Contacts, Leads, Accounts, or Deals.
- Once approved, the next document should define CRM feature module user stories on top of this shell.
