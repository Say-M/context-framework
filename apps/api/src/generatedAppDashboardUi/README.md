# Flameflow Dashboard Hub

# Build Flameflow — Independent Project Management Dashboard

## 1. Product overview

Build a polished, production-quality frontend for **Flameflow**, an independent project management and application administration dashboard.

Flameflow is a platform where each software project has its own dedicated management dashboard. The dashboard is inspired by the clean, minimal SaaS administration experience of Base44, with a similar layout, visual hierarchy, navigation style, card design, and interaction patterns.

The reference screenshot attached to this prompt shows the visual direction.

**Important:** Build an original Flameflow product interface, not a literal Base44 clone. Use the reference for layout and visual inspiration. Do not use Base44's logo, branding, trademarks, proprietary assets, or copied text.

The dashboard will eventually manage software projects built by Flameflow, including:

* Accounting applications.
* ERP applications.
* Inventory management.
* Logistics software.
* Maritime management systems.
* AI-native applications.
* Workflow automation products.
* Custom client software.

The first project to display is:

**NGO Ledger**

This is a streamlined expense tracking application for NGOs.

The dashboard must be designed as a reusable project management shell. The same frontend should work for NGO Ledger, Retail Accounting, Logistics Management, Maritime Operations, and future projects by changing the project configuration and backend connection.

---

# 2. Primary objective

Create a complete frontend-only project management console that feels like a credible, modern SaaS administration product.

The user should be able to:

* View project overview.
* Manage project users.
* Inspect simulated database collections and records.
* View analytics.
* Manage SEO and GEO settings.
* Configure domains.
* Manage integrations.
* Manage security settings.
* Manage AI agents.
* Manage workflows.
* View system logs.
* Inspect mock API documentation.
* Manage project settings.
* Manage MCP servers.
* Share the project with collaborators.

The application should feel cohesive across all sections.

Do not create a collection of unrelated pages. Every section must use the same design system and application shell.

---

# 3. Reference screenshot and visual direction

Use the attached Base44-style screenshot as the primary visual reference for the initial Overview page.

The screenshot demonstrates:

* A permanent left sidebar.
* A search box at the top.
* A vertical navigation menu.
* A selected Overview item.
* A large, spacious main content area.
* Project logo and project name.
* Edit icons.
* Project description.
* Project creation metadata.
* Favorite icon.
* Action buttons.
* Two-column cards.
* Full-width card below.
* Subtle borders.
* Rounded corners.
* Very light neutral background.
* Black typography.
* Muted accent colors.
* Minimal visual noise.

Reproduce the **layout proportions, spacing, visual density, and design language** as closely as practical while using original Flameflow branding.

The first screen must feel like a polished project administration dashboard, not a generic admin template.

Do not add unnecessary charts, marketing banners, large hero sections, or decorative illustrations to the initial Overview page.

---

# 4. Technology requirements

Use the following stack where supported by the Lovable environment:

* React.
* TypeScript.
* Tailwind CSS.
* shadcn/ui.
* Lucide React icons.
* TanStack Router.
* React Hook Form.
* Zod.
* A supported charting library such as Recharts, if available.
* Local mock data.
* Local state and local persistence.

If the existing Lovable project uses a slightly different supported setup, preserve the existing environment while meeting the functional requirements.

## Frontend-only scope

For this implementation:

* Do not connect a real database.
* Do not create a real backend.
* Do not implement real authentication.
* Do not implement real billing or payments.
* Do not send real invitation emails.
* Do not connect real external integrations.
* Do not deploy applications.
* Do not connect real domains.
* Do not execute real API requests.
* Do not connect real MCP servers.
* Do not expose real credentials or secrets.

Use realistic mock data and simulated interactions.

Create clean interfaces and service abstractions so real backend integrations can be added later.

---

# 5. Application shell and layout

Create a full-screen dashboard application shell.

The application consists of:

1. Left project navigation sidebar.
2. Main dashboard content area.

## Desktop layout

* Sidebar width approximately 320px, matching the reference's visual proportions.
* Sidebar stays visible while navigating.
* Thin vertical divider on the sidebar's right edge.
* Main content fills the remaining width.
* Main content has generous horizontal and vertical padding.
* Main content is scrollable.
* Use a clean, spacious layout rather than a dense enterprise admin interface.

## Responsive layout

### Desktop

* Persistent sidebar.
* Two-column overview cards.
* Full dashboard layout.

### Tablet

* Sidebar remains usable or collapses appropriately.
* Main content adjusts to available width.
* Two-column cards may stack when space is limited.

### Mobile

* Sidebar becomes a slide-over drawer.
* Add a menu button in the main header.
* Main content uses full width.
* Cards stack vertically.
* Header elements wrap naturally.
* Tables become responsive with horizontal scrolling inside their own containers where necessary.
* No page-level horizontal overflow.

Ensure the application works at:

* 320px mobile width.
* 768px tablet width.
* 1024px desktop width.
* Large desktop widths.

Do not use fixed viewport-height layouts that create clipped content.

---

# 6. Design system

## Brand

Product name:

Flameflow

Use Flameflow in the interface where appropriate.

The current project is:

NGO Ledger

## Visual personality

* Minimal.
* Modern.
* Professional.
* Calm.
* High-quality SaaS.
* Developer-tool inspired.
* Business software focused.
* Clean and trustworthy.
* Spacious but not wasteful.

## Colors

Use a light theme first.

Background:

* Very light warm gray or off-white.

Cards:

* White.

Primary text:

* Near-black.

Secondary text:

* Muted gray.

Borders:

* Very light gray.

Primary accent:

* Muted blue or blue-violet.

Optional Flameflow accent:

* Warm orange.

Use orange sparingly for branding or selected highlights. Do not make the entire dashboard orange.

Use semantic colors consistently:

* Green for success and connected.
* Amber for warnings and pending.
* Red for errors and destructive actions.
* Blue or violet for informational states.

Avoid excessive gradients, bright neon colors, heavy shadows, and glassmorphism.

## Typography

Use a modern sans-serif font such as Inter or Geist.

Typography should resemble the reference:

* Strong project name.
* Clear page titles.
* Medium-weight card headings.
* Comfortable body text.
* Muted supporting descriptions.
* Small but readable metadata.

Do not use oversized headings everywhere.

## Borders and cards

* Subtle 1px borders.
* Rounded corners.
* White card backgrounds.
* Consistent padding.
* Minimal shadows.
* No excessive visual decoration.

## Buttons

Buttons should have:

* Consistent heights.
* Clear labels.
* Comfortable horizontal padding.
* Subtle borders.
* Rounded corners.
* Hover states.
* Focus states.
* Loading states where useful.

## Icons

Use Lucide React icons consistently.

Do not use emojis as primary UI icons.

Icon buttons must have accessible labels and tooltips where useful.

---

# 7. Sidebar navigation

Build a permanent left sidebar inspired by the reference screenshot.

## Search

At the top of the sidebar, include a search field.

Placeholder:

Search...

Requirements:

* Search icon on the left.
* Rounded rectangular input.
* Light background.
* Subtle border.
* Comfortable height.
* Gray placeholder.
* Focus ring using the accent color.

Search should filter navigation items.

Example:

* “user” → Users.
* “database” → Database.
* “workflow” → Workflows.
* “api” → API.
* “seo” → SEO & GEO.

If there are no results, show:

No results found

## Navigation items

Use this exact order:

1. Overview
2. Users
3. Database
4. Analytics
5. SEO & GEO
6. Domain
7. Integrations
8. Security
9. Agents
10. Workflows
11. Logs
12. API
13. Settings
14. MCP

Each item must have:

* Lucide icon.
* Text label.
* Rounded hover state.
* Active state.
* Keyboard focus state.
* Consistent vertical spacing.

Suggested icons:

* Overview — House.
* Users — Users.
* Database — Database.
* Analytics — ChartNoAxesCombined.
* SEO & GEO — Search or Globe.
* Domain — Globe.
* Integrations — Plug.
* Security — ShieldCheck.
* Agents — Bot.
* Workflows — GitBranch.
* Logs — History.
* API — Braces.
* Settings — Settings.
* MCP — Cable or Network.

Use the closest available icon if necessary.

## Active state

The selected navigation item should use:

* Soft warm gray background.
* Dark text.
* Slightly stronger font weight.
* Rounded corners.

Do not use a bright blue active background.

The active state must update when navigating.

## Sidebar footer

At the bottom, reserve space for:

* Flameflow branding.
* Current project identifier.
* Environment label.
* Optional account menu placeholder.

Keep the footer subtle.

---

# 8. Routing and nested dashboard navigation

Use TanStack Router search parameters or nested frontend state.

The selected dashboard section must be linkable, refreshable, and preserved in the URL.

Preferred structure:

```text
/dashboard?projectId=ngo-ledger&section=overview
/dashboard?projectId=ngo-ledger&section=users
/dashboard?projectId=ngo-ledger&section=database
/dashboard?projectId=ngo-ledger&section=analytics
/dashboard?projectId=ngo-ledger&section=seo
/dashboard?projectId=ngo-ledger&section=domain
/dashboard?projectId=ngo-ledger&section=integrations
/dashboard?projectId=ngo-ledger&section=security
/dashboard?projectId=ngo-ledger&section=agents
/dashboard?projectId=ngo-ledger&section=workflows
/dashboard?projectId=ngo-ledger&section=logs
/dashboard?projectId=ngo-ledger&section=api
/dashboard?projectId=ngo-ledger&section=settings
/dashboard?projectId=ngo-ledger&section=mcp
```

Use typed route search parameters where supported.

Requirements:

* Sidebar navigation updates the URL.
* Refreshing the page preserves the selected section.
* Browser back and forward work.
* Invalid section values fall back to Overview.
* Project ID is preserved when switching sections.
* Each section has a clear page title.
* Navigation does not require a full page reload.

Do not use separate unrelated application shells for each page.

---

# 9. Project configuration architecture

This is a critical requirement.

The dashboard must not be hardcoded exclusively for NGO Ledger.

Create a centralized typed project configuration.

Example:

```ts
type ProjectConfig = {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  createdAt: string;
  visibility: "public" | "private" | "team" | "restricted";
  isFavorite: boolean;
  badgeVisible: boolean;
  previewUrl: string;
  environment: "development" | "staging" | "production";
  deploymentStatus: "deployed" | "building" | "failed" | "not_deployed";
  backendUrl?: string;
};
```

Default project:

```ts
const ngoLedgerProject: ProjectConfig = {
  id: "ngo-ledger",
  name: "NGO Ledger",
  description:
    "A streamlined expense tracking tool designed for NGOs to manage project costs, categorize spending, and maintain financial transparency.",
  createdAt: "2026-08-14",
  visibility: "public",
  isFavorite: false,
  badgeVisible: true,
  previewUrl: "https://ngo-ledger.flameflow.local",
  environment: "production",
  deploymentStatus: "deployed",
};
```

Use the project configuration everywhere:

* Project header.
* Project name.
* Description.
* Logo.
* Preview URL.
* Visibility.
* Favorite state.
* Project settings.
* Share link.
* Analytics labels.
* API configuration.
* Agents.
* Workflows.
* Logs.

Do not duplicate project information in multiple components.

---

# 10. Independent project backend abstraction

The dashboard is frontend-only for now, but it must be structured for independent backend connections.

Create a mock project backend provider or repository.

Example:

```ts
interface ProjectBackend {
  getProject(): Promise<ProjectConfig>;
  updateProject(
    updates: Partial<ProjectConfig>
  ): Promise<ProjectConfig>;

  getUsers(): Promise<User[]>;
  getDatabaseCollections(): Promise<DataCollection[]>;
  getAnalytics(): Promise<AnalyticsData>;
  getAgents(): Promise<Agent[]>;
  getWorkflows(): Promise<Workflow[]>;
  getLogs(): Promise<LogEntry[]>;
}
```

Implement a local mock provider.

Each project should eventually be able to have:

* Its own project ID.
* Its own backend URL.
* Its own database.
* Its own users.
* Its own analytics.
* Its own agents.
* Its own workflows.
* Its own API configuration.
* Its own security settings.

For now, all of this is simulated locally.

The frontend should not need to be rewritten when real project backends are connected later.

---

# 11. Project header

Create a project header similar to the reference screenshot.

The header should appear at the top of the main content area.

## Project identity

Include:

### Project logo

* Approximately 100px × 100px on desktop.
* Rounded square container.
* Muted teal background.
* Original geometric Flameflow/NGO Ledger logo.
* Use inline SVG or CSS-generated logo.
* Do not copy the Base44 logo.

On mobile, reduce the size.

### Project name

Default:

NGO Ledger

Typography:

* Large.
* Bold.
* Near-black.
* Similar visual prominence to the reference.

Add an edit icon button beside the title.

Clicking opens a project edit modal.

Modal fields:

* Project name.
* Project description.
* Project logo placeholder.
* Project slug.

Use React Hook Form and Zod validation.

Save updates local project state.

### Description

Default:

A streamlined expense tracking tool designed for NGOs to manage project costs, categorize spending, and maintain financial transparency.

Display in muted gray text.

### Creation metadata

Display:

Created a month ago

Use a small muted text style.

### Favorite

Place a star icon at the top-right.

Behavior:

* Toggle favorite.
* Outline star when inactive.
* Filled or highlighted star when active.
* Accessible label.
* Tooltip.

### Edit

Add a secondary edit icon near the upper-right, matching the reference hierarchy.

It can open the same project edit modal.

---

# 12. Header action buttons

Below the project identity, add:

1. Earn credits.
2. View usage.
3. More menu.

## Earn credits

Use a share icon.

Clicking opens a modal or popover.

Content:

Invite collaborators and earn project credits.

Mock information:

Available credits: 120

Frontend-only.

## View usage

Use a gauge or activity icon.

Open a usage modal containing mock metrics:

* API requests this month.
* Storage usage.
* Active users.
* Workflow executions.
* AI agent runs.

## More menu

Use a three-dot icon button.

Menu items:

* Rename project.
* Duplicate project.
* Export project configuration.
* Archive project.
* Delete project.

Destructive actions require confirmation.

Do not perform real backend mutations.

---

# 13. Dashboard Overview section

The Overview page must match the visual structure of the reference screenshot as closely as possible.

Do not add unnecessary content above the primary cards.

## Overview summary

Show a compact overview section containing:

* Project status.
* Preview URL.
* Mock deployment status.
* Visits.
* Active users.
* Recent builds.
* Recent activity.
* Technology summary.
* Quick actions.

Use clean metric cards and activity panels.

Do not overcrowd the page.

## App Visibility card

Title:

App Visibility

Description:

Control who can access your application

Default:

Public

Dropdown options:

* Public.
* Private.
* Team only.
* Restricted.

Use an appropriate icon.

When changed:

* Update local state.
* Show success toast.
* Reflect the value in project configuration.

## Invite Users card

Title:

Invite Users

Description:

Grow your user base by inviting others

Include:

* Copy Link button.
* Send Invites button.

Copy Link:

Use mock URL:

https://ngo-ledger.flameflow.local/invite

Show a toast or modal with the link.

Send Invites:

Open invitation modal with:

* Email address.
* Optional message.
* Role selection.
* Send invitation button.

Roles:

* Admin.
* Manager.
* Member.
* Viewer.

Add invitation to local mock state.

Do not send real emails.

## Platform Badge card

Full-width card beneath the first row.

Title:

Platform Badge

Description:

The Flameflow badge is currently visible on your app.

Button:

Hide Badge

Behavior:

* Toggle visibility.
* Update card description.
* Change button to Show Badge when hidden.
* Use Eye/EyeOff icons.

The Overview page should closely match the reference's three-card structure:

* App Visibility.
* Invite Users.
* Platform Badge.

---

# 14. Users section

Build a complete mock Users management interface.

Page title:

Users

Subtitle:

Manage people who can access this project.

## Summary cards

Show:

* Total users.
* Active users.
* Pending invitations.

## User table

Columns:

* Name.
* Email.
* Role.
* Status.
* Last active.
* Joined date.
* Actions.

Mock users:

* Admin User — [admin@ngo-ledger.local](mailto:admin@ngo-ledger.local) — Admin.
* Project Manager — [manager@ngo-ledger.local](mailto:manager@ngo-ledger.local) — Manager.
* Finance Officer — [finance@ngo-ledger.local](mailto:finance@ngo-ledger.local) — Member.
* Viewer — [viewer@ngo-ledger.local](mailto:viewer@ngo-ledger.local) — Viewer.

Features:

* Search users.
* Filter by role.
* Filter by status.
* Pagination.
* Invite user modal.
* Edit role.
* Deactivate user.
* Reactivate user.
* Remove user.

Use realistic status badges.

Use local state and local persistence.

---

# 15. Database section

Clearly label this section:

**Simulated Database**

Add a visible informational badge:

Mock data — no real database connection

Do not connect to any real database.

## Database overview

Show:

* Mock database connection status.
* Database type: Simulated.
* Table/collection count.
* Total mock records.
* Last simulated sync.

## Collection list

Mock collections:

* Expenses.
* Projects.
* Employees.
* Vendors.
* Approvals.
* Categories.
* Transactions.

Each row includes:

* Collection name.
* Description.
* Record count.
* Last updated.
* Status.
* Actions.

## Schema viewer

When a collection is selected, show:

* Field name.
* Data type.
* Required status.
* Example value.
* Primary key indicator.

Example Expenses fields:

* id.
* projectId.
* employeeName.
* amount.
* currency.
* category.
* status.
* submittedAt.
* approvedBy.

## Data-grid preview

Display realistic mock records in a responsive data grid.

Features:

* Search.
* Column headers.
* Sorting-style controls.
* Pagination.
* Add record.
* View record.
* Edit record.
* Delete record from local state.

## Add-record form

Use a modal or drawer.

Use React Hook Form and Zod validation.

## Query console

Create a query-console-style interface.

Show:

* Simulated query input.
* Run query button.
* Mock response panel.
* Execution status.
* Execution time.

Clearly label:

Simulated query — no real database execution.

Do not execute arbitrary code.

## Connection configuration modal

Include:

* Mock connection status.
* Database type.
* Host placeholder.
* Port placeholder.
* Database name placeholder.
* Username placeholder.
* Password placeholder.

Mask all password fields.

Show:

This is a simulated connection configuration.

---

# 16. Analytics section

Build a polished analytics dashboard using realistic mock data.

Include a date range selector:

* Last 7 days.
* Last 30 days.
* Last 90 days.

Charts:

1. Visitors.
2. Sessions.
3. Page views.
4. Conversion rate.
5. Device breakdown.
6. Traffic sources.
7. Top pages.
8. Country distribution.

Use responsive charts if a supported chart library is available.

## Metric cards

Show:

* Visitors.
* Sessions.
* Page views.
* Conversion.
* Returning users.
* Average session duration.

Use realistic mock values.

## Chart requirements

* Clear titles.
* Tooltips.
* Legends where useful.
* Accessible labels.
* Responsive sizing.
* No unnecessary chart decoration.
* Keep chart colors consistent with the design system.

All analytics are simulated.

---

# 17. SEO & GEO section

Build a professional SEO and AI-search readiness settings interface.

Page title:

SEO & GEO

Subtitle:

Manage how your project is discovered by search engines and AI-powered search experiences.

## SEO settings

Fields:

* Page title.
* Meta description.
* Keywords.
* Canonical URL.
* Robots configuration.

Use React Hook Form and Zod.

Validation requirements:

* Page title required.
* Meta description length validation.
* Valid URL validation where applicable.
* Keywords input validation.
* Clear inline error messages.
* Save button.
* Success toast.

## Open Graph preview

Create a social sharing preview card showing:

* Preview image placeholder.
* Page title.
* Meta description.
* Domain.

## Sitemap

Show:

* Sitemap status.
* Last generated time.
* Sitemap URL placeholder.
* Generate sitemap button.

Simulate generation.

## Robots configuration

Show a clean configuration card with:

* Indexing allowed toggle.
* Follow links toggle.
* Robots text preview.

## AI-search/GEO readiness

Show a mock score:

AI-search readiness score: 78/100

Breakdown:

* Page title.
* Description.
* Structured data.
* Sitemap.
* Crawlability.
* Content clarity.
* Entity information.

Use a progress indicator.

Clearly label this as a simulated score.

## Structured-data checklist

Checklist items:

* Organization schema.
* WebSite schema.
* Breadcrumb schema.
* Product or application schema.
* FAQ schema.
* Contact information.

Use checkboxes and status indicators.

---

# 18. Domain section

Build a domain management interface.

Page title:

Domain

## Default subdomain

Show:

ngo-ledger.flameflow.local

Status:

Connected

## Custom domain

Include:

* Custom domain input.
* Add domain button.
* Domain status.
* SSL status.
* Verification status.

Mock custom domain:

app.ngoledger.example

## DNS instructions

Show a clear instructions card with mock DNS records.

Example:

Type: CNAME

Name: app

Value: proxy.flameflow.local

Clearly label all values as examples.

## Verification simulation

Include:

* Verify domain button.
* Simulated verification progress.
* Success state.
* Pending state.
* Failed state.

Do not perform real DNS or SSL operations.

---

# 19. Integrations section

Build searchable integration cards organized by category.

Categories:

* Payments.
* Authentication.
* Analytics.
* Storage.
* Communication.
* Developer tools.

Mock integrations:

* Stripe.
* Google Analytics.
* Google Sheets.
* Slack.
* Gmail.
* Supabase.
* Firebase.
* GitHub.
* Webhooks.
* REST API.

Each card includes:

* Icon.
* Name.
* Description.
* Category.
* Connected/not connected status.
* Connect button.
* Configure button.
* Disconnect button.

Features:

* Search integrations.
* Filter by category.
* Mock connect.
* Mock configure.
* Mock disconnect.
* Local persistence.

Do not connect real external services.

---

# 20. Security section

Build a polished project security settings page.

Clearly label this as simulated security information.

## Security overview

Show:

* Security score.
* Authentication status.
* Active sessions placeholder.
* Last security scan.
* Vulnerability scan status.

Mock score:

Security score: 86/100

## Authentication

Show:

* Authentication enabled.
* Login method.
* Email verification.
* Session timeout.
* Require invitation to join.

Use toggles and status badges.

## Environment variables

Show masked mock values.

Example:

DATABASE_URL = •••••••••••••

API_SECRET = •••••••••••••

JWT_SECRET = •••••••••••••

Never display real secrets.

Include:

* Add variable.
* Edit variable.
* Delete variable.

Use masked values in the interface.

## Access control

Show:

* Role permissions.
* Public/private access.
* Admin approval.
* API restrictions.

## Audit events

Show mock security events.

## CORS-style settings

Show:

* Allowed origins.
* Credentials toggle.
* Allowed methods.
* Allowed headers.

Clearly label as simulated settings.

## Rate-limit-style settings

Show:

* Requests per minute.
* Burst limit.
* Rate-limit enabled.

## Vulnerability scan simulation

Include:

Run security scan button.

Show mock scan results:

* Dependency health.
* Configuration health.
* Authentication checks.
* API exposure checks.

Do not run real scans.

---

# 21. Agents section

Build an AI agent management interface.

Page title:

Agents

Subtitle:

Manage specialized AI agents for your project.

Mock agents:

1. UI Designer.
2. Frontend Engineer.
3. Code Reviewer.
4. SEO Specialist.
5. Test Engineer.

Each agent card includes:

* Agent icon.
* Agent name.
* Description.
* Enabled/disabled status.
* Simulated permissions.
* Last run.
* Number of runs.
* Configure button.

## Agent behavior

Allow:

* Enable agent.
* Disable agent.
* Adjust simulated permissions.
* Edit agent settings.
* View agent details.
* Delete mock agent.

## Permissions

Mock permissions:

* Read project files.
* Edit project files.
* View database schema.
* Run tests.
* Read analytics.
* Modify SEO settings.

All permissions are simulated.

## Create agent

Include a modal with:

* Agent name.
* Description.
* Role.
* Permissions.
* Status.

Use React Hook Form and Zod.

---

# 22. Workflows section

Build a node-inspired workflow management interface.

This is a workflow list and detail interface, not a full workflow engine.

## Mock workflows

1. On project update.
2. On deployment.
3. On user registration.
4. Scheduled analytics report.

Each workflow shows:

* Name.
* Trigger.
* Status.
* Last run.
* Number of steps.
* Actions.

## Actions

Allow:

* Enable/disable.
* Run mock workflow.
* Duplicate.
* Delete.
* View details.

## Workflow details

Use a clean node-inspired step layout.

Example:

Trigger → Validate Data → Execute Action → Notify User → Complete

Use cards, connectors, or a simple stepper.

Do not build a complex visual workflow editor in the first version.

## Create workflow

Fields:

* Workflow name.
* Description.
* Trigger type.
* Status.

Trigger options:

* Manual.
* Project update.
* Deployment.
* User registration.
* Scheduled.
* Webhook.
* Agent event.

Use local mock state.

---

# 23. Logs section

Build a searchable, filterable logs interface.

Page title:

Logs

Subtitle:

Monitor simulated project activity and system events.

## Filters

* Search.
* Severity.
* Source.
* Date range.
* Event type.

## Logs table

Columns:

* Timestamp.
* Severity.
* Source.
* Message.
* Request ID.
* Status.
* Details.

Mock log entries:

* User invited.
* Project settings updated.
* Workflow executed.
* Agent activated.
* API request received.
* Domain added.
* Security scan completed.

Severity:

* Info.
* Success.
* Warning.
* Error.

## Expandable details

Clicking a row opens a detail panel or expandable section with:

* Full message.
* Timestamp.
* Request ID.
* Source.
* Mock payload.
* Mock stack trace where relevant.

## Live stream

Include a live-stream toggle.

When enabled:

* Simulate new logs appearing at a controlled interval.
* Do not create unbounded entries.
* Include a pause/stop control.
* Respect reduced-motion preferences.

Add:

Clear view

This clears the visible mock log entries only.

---

# 24. API section

Build a mock API documentation and management interface.

Clearly label:

**Prototype API — Demonstration only**

## API overview

Show:

* Mock API status.
* Base URL.
* API version.
* Request count.
* API key count.

## Endpoint documentation

Include mock endpoints such as:

GET /api/projects

GET /api/users

GET /api/database/collections

GET /api/analytics

POST /api/workflows/run

GET /api/logs

Each endpoint includes:

* HTTP method badge.
* Endpoint path.
* Description.
* Request parameters.
* Response example.
* Copy-code button.

## API key management

Show:

* Key name.
* Environment.
* Created date.
* Last used.
* Status.
* Actions.

Create API key modal:

* Key name.
* Environment.
* Permissions.
* Create button.

Show a masked mock key:

pk_flameflow_demo_••••••••

Do not display real credentials.

Do not make real API calls.

---

# 25. Settings section

Build a complete project settings page.

Use React Hook Form and Zod for editable settings.

## General settings

Fields:

* Project name.
* Description.
* Project slug.
* Project logo placeholder.
* Timezone.
* Default language.

## Project settings

Fields:

* Visibility.
* Default workspace tab.
* Environment.
* Project ID display.
* Project status.

## Appearance

Fields:

* Theme.
* Brand color.
* Platform badge visibility.
* Logo settings.

## Save behavior

* Validate fields.
* Show inline validation errors.
* Save to local state.
* Persist locally.
* Show success toast.

## Danger zone

Include separate destructive cards:

* Archive project.
* Transfer ownership.
* Delete project.

### Archive project

Show confirmation dialog.

### Transfer ownership

Show confirmation dialog with:

* New owner email.
* Typed confirmation or explicit confirmation.

### Delete project

Require typed confirmation.

Example:

Type DELETE NGO LEDGER to confirm.

Use the exact project name dynamically.

Do not perform real destructive backend operations.

---

# 26. MCP section

Build a mock MCP server-management interface.

Page title:

MCP

Subtitle:

Manage simulated Model Context Protocol connections for your project.

## Empty state

If there are no servers, show a concise explanation:

MCP allows AI applications and agents to connect to tools and structured project context through a standardized interface.

Keep this explanation brief.

## Server list

Mock servers:

* NGO Ledger Context Server.
* Expense Workflow Server.
* Accounting Data Server.

Each card shows:

* Server name.
* Description.
* Connection status.
* Available tools count.
* Last synchronized time.
* Configure button.
* Connect/disconnect button.

## Add server form

Fields:

* Server name.
* Description.
* Server URL placeholder.
* Status.
* Available tools count.

Use React Hook Form and Zod.

## Tool permissions

Show mock tool permissions:

* Read expenses.
* Read projects.
* Create expense.
* Approve expense.
* Generate financial report.

Allow enabling/disabling simulated permissions.

Do not connect to real MCP servers.

---

# 27. Share experience

The Share button must open a polished modal.

This feature is important.

## Share modal

Include:

* Public/private toggle.
* Shareable link.
* Copy link button.
* Invite by email.
* Role selection.
* Existing collaborators.
* Remove-access action.

## Visibility

Options:

* Public.
* Private.

Changing visibility updates local project state.

## Shareable link

Use a mock link based on the project ID.

Example:

https://ngo-ledger.flameflow.local/share

Include a copy button.

## Invite by email

Fields:

* Email address.
* Role.

Roles:

* Viewer.
* Editor.

Include:

Send invitation

Add the invitation to a mock collaborator list.

## Existing collaborators

Show:

* Name.
* Email.
* Role.
* Status.
* Remove access.

Use local state and local persistence.

Do not send real emails.

---

# 28. Mock data and persistence

Create realistic mock data for every section.

The dashboard should never look empty unless an intentional empty state is being demonstrated.

Use mock data for:

* Project.
* Users.
* Invitations.
* Database collections.
* Database records.
* Analytics.
* Domains.
* Integrations.
* Security events.
* Agents.
* Workflows.
* Logs.
* API keys.
* MCP servers.
* Collaborators.

Use local state and local persistence where supported.

Persist user changes such as:

* Project name.
* Project description.
* Favorite state.
* Visibility.
* Badge visibility.
* Users.
* Invitations.
* Agent enabled state.
* Workflow enabled state.
* Integration status.
* Security toggles.
* Share collaborators.

Provide a clean mock data reset mechanism if useful for development, but do not place unnecessary reset controls prominently in the production-style UI.

---

# 29. Component architecture

Use reusable components and a clean structure.

Suggested architecture:

```text
src/
  components/
    layout/
      AppShell.tsx
      Sidebar.tsx
      SidebarSearch.tsx
      SidebarNav.tsx
      MobileSidebar.tsx

    project/
      ProjectHeader.tsx
      ProjectLogo.tsx
      ProjectEditModal.tsx
      ProjectActions.tsx
      ShareModal.tsx

    ui/
      PageHeader.tsx
      StatCard.tsx
      SettingsCard.tsx
      StatusBadge.tsx
      DataTable.tsx
      SearchInput.tsx
      EmptyState.tsx
      ConfirmDialog.tsx
      DetailDrawer.tsx
      Toast.tsx

    overview/
      ProjectSummary.tsx
      AppVisibilityCard.tsx
      InviteUsersCard.tsx
      PlatformBadgeCard.tsx
      RecentActivity.tsx
      RecentBuilds.tsx

    database/
      CollectionList.tsx
      SchemaViewer.tsx
      DataGrid.tsx
      QueryConsole.tsx

    analytics/
      AnalyticsChart.tsx
      MetricCard.tsx

    agents/
      AgentCard.tsx
      AgentForm.tsx

    workflows/
      WorkflowCard.tsx
      WorkflowSteps.tsx
      WorkflowForm.tsx

  pages/
    Dashboard.tsx
    Overview.tsx
    Users.tsx
    Database.tsx
    Analytics.tsx
    SeoGeo.tsx
    Domain.tsx
    Integrations.tsx
    Security.tsx
    Agents.tsx
    Workflows.tsx
    Logs.tsx
    Api.tsx
    Settings.tsx
    Mcp.tsx

  context/
    ProjectContext.tsx

  services/
    mockProjectBackend.ts

  data/
    mockProject.ts
    mockUsers.ts
    mockDatabase.ts
    mockAnalytics.ts
    mockAgents.ts
    mockWorkflows.ts
    mockLogs.ts

  types/
    project.ts
    users.ts
    database.ts
    analytics.ts
    agents.ts
    workflows.ts
    logs.ts
```

Use an equivalent structure if the existing application has a better convention.

---

# 30. Forms and validation

Use React Hook Form and Zod for all meaningful forms.

Forms include:

* Project editing.
* Invite user.
* Add database record.
* Database connection configuration.
* SEO & GEO settings.
* Domain configuration.
* Integration configuration.
* Agent creation.
* Workflow creation.
* API key creation.
* Project settings.
* Add MCP server.
* Share invitation.

Requirements:

* Typed form data.
* Required field validation.
* URL validation where appropriate.
* Email validation.
* Clear inline errors.
* Disabled submit state during simulated submission.
* Success feedback.
* Cancel behavior.
* Modal close behavior.

---

# 31. Accessibility

Implement:

* Semantic HTML.
* Accessible labels.
* Keyboard navigation.
* Visible focus states.
* Aria-labels for icon buttons.
* Accessible modals.
* Sufficient contrast.
* Keyboard-friendly dropdowns.
* Accessible tables.
* Accessible tooltips.
* No essential information conveyed only through color.

---

# 32. Performance and quality

* Use TypeScript.
* Keep components modular.
* Avoid unnecessary dependencies.
* Avoid hardcoded repeated project information.
* Keep mock data separate from UI.
* Avoid excessive re-renders.
* Use bounded mock log streaming.
* Respect prefers-reduced-motion.
* Avoid page-level horizontal scrolling.
* Ensure all routes work.
* Ensure all buttons perform their intended mock action.
* Ensure all dialogs can be closed.
* Ensure no broken navigation.
* Ensure no console errors.
* Ensure no missing icons.
* Ensure no placeholder pages for required sections.

---

# 33. Exact first screen priority

The first screen must be the Overview section for NGO Ledger.

It should show:

## Sidebar

* Search...
* Overview selected.
* Users.
* Database.
* Analytics.
* SEO & GEO.
* Domain.
* Integrations.
* Security.
* Agents.
* Workflows.
* Logs.
* API.
* Settings.
* MCP.

## Project header

* Original NGO Ledger logo.
* NGO Ledger title.
* Edit icon.
* Description.
* Created a month ago.
* Favorite star.
* Secondary edit icon.

## Action row

* Earn credits.
* View usage.
* More menu.

## Overview cards

First row:

* App Visibility.
* Invite Users.

Second row:

* Platform Badge full width.

Then include the additional Overview summary sections below the primary cards:

* Project status.
* Preview URL.
* Mock deployment status.
* Visits.
* Active users.
* Recent builds.
* Recent activity.
* Technology summary.
* Quick actions.

Keep the initial above-the-fold layout visually close to the reference screenshot.

---

# 34. Final deliverables

Build the complete frontend application with:

1. Flameflow-branded dashboard shell.
2. Base44-inspired visual design.
3. Responsive sidebar.
4. Project header.
5. Overview page.
6. Users page.
7. Database page.
8. Analytics page.
9. SEO & GEO page.
10. Domain page.
11. Integrations page.
12. Security page.
13. Agents page.
14. Workflows page.
15. Logs page.
16. API page.
17. Settings page.
18. MCP page.
19. Share modal.
20. Mock backend provider.
21. Centralized project configuration.
22. Local state and persistence.
23. React Hook Form and Zod validation.
24. TanStack Router navigation.
25. Reusable UI components.
26. Accessible and responsive design.

---

# 35. Final quality instruction

Build this as a serious, production-quality SaaS project management console.

The visual quality of the Overview page is the highest priority.

Do not make it look like a generic dashboard template.

Use the attached reference screenshot to match:

* Sidebar proportions.
* Header hierarchy.
* Card structure.
* Button styling.
* Spacing.
* Typography.
* Borders.
* Neutral background.
* Overall visual density.

Use original Flameflow branding.

Start by building and refining the Overview page until it looks excellent. Then implement the remaining dashboard sections using the same design system.

The finished frontend must feel like an independent project management dashboard that can eventually connect to separate backends for each software project.

**Do not build a real backend in this task. Build the complete frontend and the architecture for future backend integration.**

## This dashboard

This is Flameflow Dashboard Hub, vendored in as this project's default dashboard by the
context-framework generator. It runs as its own app alongside `backend/` and `frontend/`, and
authenticates against the dashboard access-authentication API mounted at `/__dashboard/api/*` in
this project's `backend/` (see `backend/src/dashboard/server.ts`) — the first person to open the
dashboard sets an owner email+password; every other dashboard user is added via an owner-issued
invite.

## Development

```sh
cd dashboard/ui
bun install
bun run dev
```
