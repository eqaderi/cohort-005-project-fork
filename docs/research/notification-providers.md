# Hosted notification providers vs building in-house

Research for [#7](https://github.com/eqaderi/cohort-005-project-fork/issues/7), part of the map [#4](https://github.com/eqaderi/cohort-005-project-fork/issues/4) (In-app Notifications for Cadence).

**Question:** What are the realistic options for an in-app Notification feed (bell, unread count, feed) for Students, Instructors and Platform Admins? The options are hosted providers (Knock, Novu, MagicBell, SuprSend, Courier) and building it ourselves on SQLite/Drizzle.

**Scope:** This is facts and trade-offs only. A later grilling ticket makes the build-vs-buy decision.

**Sources:** Official docs, pricing pages and first-party repos only, read in November 2026. Pricing pages change often, so recheck the numbers before deciding. Where a doc page did not say something, this file says "not stated" and does not guess.

## Cadence constraints that matter here

From the map (#4) and the repo:

- In-app only for now. Email and push come later, so the choice must not rule them out.
- Notifications fire only when something happens, never on a schedule. Recipients can mute.
- The stack is React Router 8.3 in framework mode, served by `react-router-serve` as a long-running Node process (`package.json`). SQLite runs through `better-sqlite3` and Drizzle (`app/db/index.ts`). Tests use Vitest.
- In local dev, the DevUI panel switches between seeded users. Any hosted provider must therefore know about every seeded user ID, and its client auth token must follow the current DevUI user.

## Summary table

| | Knock | Novu | MagicBell | SuprSend | Courier | Build in-house |
|---|---|---|---|---|---|---|
| React UI | `@knocklabs/react`: popover, full feed, bell button, plus hooks | `@novu/react`: `<Inbox/>`, Bell, Notifications, Preferences, plus hooks; `@novu/js` | `@magicbell/react`: Inbox, FloatingInbox, UserPreferences | `@suprsend/react`: Inbox popover, full-screen and side-sheet feeds, headless hooks | `@trycourier/courier-react`: `<CourierInbox/>` | Our own components (shadcn/Radix already in the repo) |
| Real-time | WebSockets | WebSocket (`ws` service) | Persistent connection; transport not stated | socket.io | "Real time"; transport not stated | Our choice: polling/revalidate, or SSE from a resource route |
| States | unread, read, seen, archived, interacted | read, seen, archived, snoozed | read/unread, archived, deleted | seen, read, archived | read, opened, archived | Whatever we model |
| Preferences/muting | Workflow, category and channel opt-outs; conditions for per-resource muting | Global and per-workflow channel prefs; critical workflows | Per-category and per-channel; UI component | Category and channel; "can't unsubscribe" type; **Business plan ($250/mo)** | Product exists; plan not stated | Our own table |
| Grouping | Batch function (key, window, sliding window) | Digest step | Not stated (workflows: broadcast/wait/pause/abort only) | Batch node; **Business plan** | Digest/batching listed under **Enterprise** | Our own query or aggregation |
| Free tier | 10,000 messages/mo | 10,000 workflow runs/mo, 5 workflows, 24h activity retention | 1,000 deliveries/mo | 10,000 notifications/mo; in-app feed carries SuprSend branding | 10,000 sends/mo | $0 (our hosting) |
| First paid tier | $250/mo (50k) | From $30/mo (30k runs) | $249/mo (50k) | $100/mo (Essentials, 50k) | $0.005 per send, pay as you go | n/a |
| Self-host / open source | No | Yes. MIT core, enterprise folder commercial. Needs MongoDB, Redis, S3 | Not stated | Enterprise only (self-hosted, BYOC beta) | Not stated | Yes (it is ours) |
| Local dev / test | Separate dev environment; `sandbox_mode` and `skip_delay` trigger settings; CLI | Dev and Prod environments; `npx novu dev` tunnel to a local bridge; can self-host locally | Not documented beyond projects | Per-workspace keys (sandbox, staging, prod) | Test environments count toward billing | Plain Vitest against SQLite, no network |
| Email/push later | Built in (channels) | Built in (email, SMS, chat, push) | Built in (email, push, web push, SMS, Slack) | Built in | Built in | We integrate an email or push provider ourselves |

The sections below give the detail and sources.

## Knock

**Feed and React.** `@knocklabs/react` provides `NotificationFeedPopover`, `NotificationFeed` and `NotificationIconButton`, a bell showing "the current count of unread or unseen notifications". `@knocklabs/client` is the plain JS client. For headless UI there are hooks `useKnockClient`, `useNotifications(knockClient, channelId)` and `useNotificationStore(feedClient)`. In headless mode "you're responsible for marking items as seen" (`feedClient.markAsSeen`, `markAllAsSeen`).
- https://docs.knock.app/in-app-ui/react/overview
- https://docs.knock.app/in-app-ui/react/custom-notifications-ui

**Real-time.** Clients connect to Knock's real-time service, which pushes new in-app messages over WebSockets. Messages are generated ahead of time, when a workflow runs for a recipient, and "can't be changed" once generated. https://docs.knock.app/in-app-ui/feeds/overview

**State.** Messages can be unread, read, seen or archived, plus "interacted". The feed returns aggregate unread, read and seen counts for the badge. (Same source.)

**Client auth.** In enhanced security mode, the backend signs an RS256 JWT with `sub` = user ID and passes it as `userToken` to `KnockProvider`. This mode is off by default, and "Production environments should enable enhanced security mode." https://docs.knock.app/in-app-ui/security-and-authentication

**Preferences and muting.** A `PreferenceSet` holds booleans keyed by `workflows`, `categories`, `channel_types` and `channels`. Anything unset defaults to `true`. Advanced conditions on the preference model support per-resource muting, for example muting one course or thread. You can set an environment-wide default PreferenceSet. Workflows can override preferences, for example for password resets. Knock offers a hosted preference center, or you can build your own UI with hooks. https://docs.knock.app/preferences/overview

**Grouping.** The batch function takes an optional batch key (for example `page_id`, or a Liquid expression), and a fixed, dynamic or relative window. It also supports a sliding window with a maximum extension and a maximum activity count (2–1000). Templates get `total_activities`, `total_actors`, `activities` and `actors`. By default templates see only 10 activities or actors; raising that to 100 is Enterprise only. https://docs.knock.app/designing-workflows/batch-function

**Pricing.** Free plan: $0 for 10,000 messages a month, 30-day log retention, and unlimited workflows and environments. A message is "a single message delivered to a single user on a single channel", so in-app plus email counts as two. There is no hard cap; Knock contacts you about billing if you go over. Starter: $250/mo for 50,000 messages, then $0.005 each. Preferences and batching are on all plans. Per-tenant preferences are Enterprise only. https://knock.app/pricing

**Self-hosting.** No self-hosted option appears on the pricing page. SaaS only.

**Local dev and testing.** There are separate development and production environments, with isolated users and messages and their own API keys. Workflows are committed in development and promoted to production. https://docs.knock.app/concepts/environments The trigger API accepts `settings.sandbox_mode`, which generates and previews messages "without delivering them to the underlying providers", and `settings.skip_delay`. The CLI can run workflows. The docs do not say whether sandbox mode writes in-app feed messages. https://docs.knock.app/send-notifications/testing-workflows No official guidance on mocking Knock in unit tests was found.

**Email or push later.** Add a channel step to the same workflow. Each channel delivery counts as a separate message for billing.

## Novu

**Feed and React.** `@novu/react` provides `<Inbox />` and the Bell, Notifications, InboxContent and Preferences components, plus hooks. It needs React 18 or later; React 19 is supported. `@novu/js` is framework-agnostic. https://docs.novu.co/platform/inbox/overview

**Real-time and state.** The `useNotifications` hook updates "in real-time when new notifications arrive"; `realtime: false` "disables the WebSocket subscription". Each notification has `isRead`, `isSeen`, `isArchived` and `isSnoozed` flags, and `read()`, `unread()`, `seen()`, `archive()` and `unarchive()` actions. https://docs.novu.co/platform/sdks/react/hooks/use-notifications In self-hosted deployments the Inbox's `socketUrl` points at the `ws` service on port 3002. https://docs.novu.co/community/self-hosting-novu/deploy-with-docker

**Client auth.** For production, the Inbox should use HMAC (`subscriberHash`). https://docs.novu.co/platform/inbox/prepare-for-production

**Preferences and muting.** Each workflow has default channel preferences. Subscribers have global and per-workflow channel preferences, and the most specific setting wins. "Critical" workflows ignore preferences and are hidden from the preferences UI. The page does not mention per-resource or conditional preferences. Preferences are stored per environment, and per tenant when the Inbox uses a tenant context. https://docs.novu.co/platform/concepts/preferences

**Grouping.** The digest step groups events "per subscriber (and optional grouping key)"; steps after it run once the window closes. https://docs.novu.co/platform/workflow/digest The pricing page shows digest windows tied to plans: Enterprise gets "custom delay and digest windows". Free appears to have a 24-hour digest window, but the table extraction was ambiguous, so verify.

**Pricing.** Free: 10,000 workflow runs a month, 5 workflows, 2 environments (Dev and Prod), 24-hour activity feed retention, up to 3 team members, all channels, no credit card. Pro: from $30/mo for 30,000+ runs and 20 workflows. Team: from $250/mo. Overage is $1.20 per 1,000 on Pro and Team. https://novu.co/pricing A workflow run is one execution for one subscriber, so a trigger to 15 subscribers is 15 runs. Runs still count when preferences mute every channel. https://docs.novu.co/platform/account/billing

**Self-hosting and open source.** The core is MIT. The `enterprise` folder is under a commercial license. https://github.com/novuhq/novu Self-hosting needs MongoDB, Redis (with AOF for queues) and S3-compatible storage. The minimum single VM is 4 vCPU and 8 GB RAM. https://docs.novu.co/community/self-hosting-novu/overview `docker compose up -d` starts the api (3000), dashboard (4000), ws (3002), worker, mongodb and redis services. https://docs.novu.co/community/self-hosting-novu/deploy-with-docker

Some features are Cloud-only: Inbox snooze, removing branding, more than 2 environments, RBAC, SSO, and more than one team member. Digest is available in both. https://docs.novu.co/community/self-hosted-and-novu-cloud The pricing page lists "Self-hosted" under Enterprise, as a supported on-prem offering. It sits alongside the community self-host above.

**Local dev and testing.** Novu Framework lets you define workflows in code behind a "bridge" endpoint in your app. `npx novu dev` opens the dashboard's Local environment connected to your machine through a tunnel; by default it expects `http://localhost:4000/api/novu`. https://docs.novu.co/framework/studio, https://docs.novu.co/framework/endpoint Alternatively, you can run the full stack in Docker locally. No official guidance on mocking in unit tests was found.

**Email or push later.** Email, SMS, chat and push are all available on the Free plan. https://novu.co/pricing

## MagicBell

**Feed and React.** `@magicbell/react` provides `Inbox` (pagination, read and unread state), `FloatingInbox` with an `InboxButton` trigger, `UserPreferences`, `WebPushButton`, `ToastContainer` and Slack buttons. No hooks are documented on that page. Preact, Svelte and Web Components libraries also exist. https://www.magicbell.com/docs/libraries/magicbell-react

**Real-time and state.** MagicBell keeps a persistent connection, so new notifications appear "instantly"; the transport is not stated. Users can mark notifications read, archive them or delete them. A "seen" state is not mentioned. https://www.magicbell.com/docs/channels/in_app

**Client auth.** The backend signs a user JWT with the project Secret Key (HS256). Claims are `user_external_id` and/or `user_email`, plus `api_key`. https://www.magicbell.com/docs/api/authentication/user

**Preferences and muting.** Preferences are per channel and per notification category, with a preferences UI component. https://www.magicbell.com/docs/channels/in_app

**Grouping.** Not stated. The workflows page lists only `broadcast`, `wait`, `pause` and `abort` ("More commands coming soon"). https://www.magicbell.com/workflows

**Pricing.** Builder (free): 1,000 deliveries a month, 1 project, unlimited users. Startup: $249/mo for 50,000 deliveries and 5 projects, then $0.0025 per delivery. A delivery is counted per channel per user, so 100 in-app plus 50 email is 150. Deliveries dropped by preferences are not counted. https://www.magicbell.com/pricing

**Self-hosting.** Not stated. No self-hosted or open-source offering appears on the pricing or workflows pages.

**Local dev and testing.** Not documented beyond projects (1 on free). Each project is a separate environment, and extra projects on Startup cost $99/mo each. https://www.magicbell.com/pricing

**Email or push later.** Email, mobile push, web push, SMS, Slack and Teams channels are available. https://www.magicbell.com/docs

## SuprSend

**Feed and React.** `@suprsend/react` replaces the deprecated `@suprsend/react-inbox`. It provides the `Inbox` popover with a bell, full-screen and side-sheet feeds, multiple tabs through `stores` with per-tab unread counts, and headless hooks. Inbox auth moved from HMAC to "signed JWT user tokens". https://docs.suprsend.com/docs/inbox-react, https://docs.suprsend.com/docs/react-in-app-feed, https://docs.suprsend.com/docs/react-headless

**Real-time and state.** The JS SDK opens a socket.io connection (`initializeSocketConnection()`). Seen, read and archived are separate fields. Seen is set when a notification enters the viewport, and read also sets seen. Archived notifications are hidden by default. Stores can filter by tags, category, read state or archived state. https://docs.suprsend.com/docs/js-inapp-feed, https://docs.suprsend.com/docs/multi-tabs

**Preferences and muting.** Users have global channel opt-outs, category opt-in and opt-out, and per-category channel opt-outs. Each sub-category has a type: On, Off or "Can't Unsubscribe". Precedence is User, then Tenant default, then Category default. SuprSend offers a hosted or embedded preference page, plus JS, React and Angular SDKs. https://docs.suprsend.com/docs/user-preferences **User preferences and batching are listed under the Business plan ($250/mo), not Free or Essentials.** https://www.suprsend.com/pricing

**Grouping.** The batch node takes a `batch_key` (per `distinct_id` + key), a fixed, dynamic or relative window, and an optional "flush first item immediately" setting. Templates get `$batched_events_count` for "3 comments", and `$batched_events` retains 10 items by default (1–100). https://docs.suprsend.com/docs/batch

**Pricing.** Free: 10,000 notifications a month, with an in-app feed that carries SuprSend branding; premium features have a 30-day trial. Essentials: $100/mo for 50,000, removes branding. Business: $250/mo for 50,000, adds batching, digest and user preferences. Each channel per user counts once. Batched notifications count as one. Opt-outs that SuprSend drops before sending are not counted. https://www.suprsend.com/pricing

**Self-hosting.** Enterprise only: self-hosted, or BYOC (beta) running inside your own VPC. https://www.suprsend.com/pricing

**Local dev and testing.** Keys are per workspace (for example Sandbox, Staging, Production). Enhanced security mode, which verifies user tokens, is off in Sandbox, so a malformed token will appear to work locally. https://docs.suprsend.com/docs/developer/api-keys, https://docs.suprsend.com/docs/client-authentication

**Email or push later.** Built-in channels. Third-party providers such as SendGrid are billed separately by those providers. https://www.suprsend.com/pricing

## Courier (extra contender)

**Feed and React.** `@trycourier/courier-react` (v9) provides `<CourierInbox />` and `useCourier()`; Web Components are in `@trycourier/courier-ui-inbox`. Messages arrive "in real time"; the transport is not stated. Read, opened and archived states sync across devices, and an Inbox message can be marked read when the matching email is opened. The backend signs a JWT, and the client calls `signIn({ userId, jwt })`. https://www.courier.com/docs/platform/inbox/inbox-overview

**Pricing.** Developer (free): up to 10,000 sends a month. Business: $0.005 per send on every send, including the first 10,000. A send is one template to one recipient, counted once even across several channels. Test environments count the same as production. **Digest and batching are listed under Enterprise.** Preferences exist as a product, but the page does not say which plans include them. https://www.courier.com/pricing

**Self-hosting.** Not stated. None appears on the pricing page.

## Build in-house on SQLite and Drizzle

What we would own:

- **Data model.** A `notifications` table (recipient, type, the link target, actor, created_at, read_at/seen_at), a muting/preferences table, and probably a type registry in code. The schema change goes through the existing `database-migrations` skill. Drizzle `db.transaction` commits or rolls back statements together, so a Notification row can be written in the same transaction as the action that caused it (for example a Refund Request decision). https://orm.drizzle.team/docs/transactions
- **Feed UI.** Our own bell, count and feed in the sidebar (`app/components/sidebar.tsx`), built with the Radix and shadcn components already in the repo. No third-party React SDK and no client tokens are involved. Reads go through ordinary loaders using the session user, so DevUI user switching works with no extra steps.
- **Real-time options.**
  1. Load on navigation, plus `useRevalidator()`, which the docs describe for "Window focus or polling on an interval". https://reactrouter.com/api/hooks/useRevalidator
  2. Server-Sent Events from a resource route. A loader with no default component is a resource route and may return a `Response`. https://reactrouter.com/how-to/resource-routes The streaming SSE pattern is not shown on that page; returning a `ReadableStream` body is standard `Response` behaviour. `react-router-serve` is a long-running Node process, so an in-memory pub/sub works on a single instance. With more than one instance we would need a shared bus. Over HTTP/1.x, browsers allow about 6 SSE connections per domain across all tabs; HTTP/2 negotiates more (default 100). https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- **State.** Read, unread and seen are columns we define. Mark-as-read is an action.
- **Preferences and muting.** A table keyed by recipient plus a Notification type, and optionally a resource (for example a course). We check it at write time or read time.
- **Grouping.** For in-app only, this can be done at read time (group rows by type and target) or by upserting one row with a count. Digest windows and delayed sends would need a scheduler or job queue, which this effort excludes.
- **Pricing.** No vendor cost. The cost is engineering time and maintenance.
- **Local dev and testing.** Everything runs in-process against SQLite. Vitest tests need no network or vendor keys, seeded users get notifications from the seed script, and DevUI switching works as it does today.
- **Email or push later.** We would have to add a channel abstraction, a delivery or retry queue, templates and an email or push provider ourselves. Preference checks would also need to become per channel. This is the main capability hosted providers give out of the box.

## Trade-offs to weigh in the decision ticket

- **Grouping and preferences cost money on some providers.** SuprSend puts batching and preferences on Business ($250/mo). Courier puts digest and batching on Enterprise. Knock and Novu include batching or digest and preferences on Free.
- **Free tiers are generous enough for Cadence's scale**, except MagicBell (1,000 deliveries a month). Knock counts per channel, so adding email later roughly doubles usage. Novu counts per subscriber run even when every channel is muted, while MagicBell and SuprSend don't count deliveries dropped by preferences.
- **Only Novu is open source and self-hostable without Enterprise.** Its stack (MongoDB, Redis, S3, several services) is much heavier than Cadence's single SQLite file.
- **Hosted options add work around DevUI and tests.** Seeded users must be synced as provider recipients. A signed per-user token (Knock RS256, MagicBell HS256, SuprSend JWT, Novu HMAC, Courier JWT) must follow the DevUI user switch. Vitest tests need the provider client mocked, since no vendor documents a local fake. Knock's `sandbox_mode` and separate environments help; Novu can run locally in Docker or via a `novu dev` tunnel.
- **Hosted messages are generated at trigger time and stored by the vendor.** Knock says content "can't be changed" once generated. With a vendor, Cadence data (course or lesson titles in the copy) is duplicated outside SQLite. In-house, the feed can render from current data.
- **Transaction boundaries differ.** In-house, the Notification row can commit atomically with the action. With a provider, the trigger is an HTTP call after the commit, so it needs failure and retry handling.
- **Email and push later.** Every hosted option has these built in, with preferences per channel. In-house we must build channel routing, a delivery queue and provider integrations later. Nothing in-house prevents that, but it is real work.
