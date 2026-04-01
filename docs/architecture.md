# System Architecture

## Overview

The MVP uses a modular monolith architecture:

- Frontend: React + TypeScript (Vite)
- Backend: Express API with feature modules
- Database: MongoDB (Mongoose)
- Auth: JWT token auth with role checks
- Billing: Stripe Checkout + webhook lifecycle updates
- Storage: local upload folder for winner proof in MVP

## Backend Modules

- auth: register/login/me
- subscriptions: Stripe checkout session, webhook processing, cancel, and mock dev transitions
- scores: Stableford score entry and rolling latest-5 enforcement
- draws: simulation and monthly publication for random/algorithmic modes
- winners: proof upload, admin review, payout state transitions
- charities: public listing and admin CRUD starter
- dashboard: consolidated user summary
- notifications: SMTP email dispatch and delivery log persistence
- finance: event-driven ledger entries and reconciliation reports

## Role Model

- public visitor: no token, can browse concept/charities
- subscriber: authenticated user, gated features require active subscription
- admin: elevated access for draw management, charity management, winner verification

## Draw and Prize Flow

1. Admin runs simulation to preview winning numbers and tier counts.
2. Admin publishes monthly draw once.
3. System computes winners (3/4/5 matches) and creates winner records.
4. Users upload proof screenshots for their winner records.
5. Admin approves/rejects verification.
6. Approved winners can be marked paid.
7. User total winnings aggregate updates when payout is marked paid.

## Subscription Lifecycle

1. Subscriber starts Stripe checkout session for monthly or yearly plan.
2. Stripe sends webhook events.
3. Webhook updates subscription status and renewal metadata.
4. API middleware enforces active status for score/draw-eligible features.

## Notification Lifecycle

1. System emits email events on registration, subscription updates, draw publication, winner verification, and payout completion.
2. SMTP dispatch is handled via Nodemailer.
3. Every delivery attempt is persisted in notification logs for observability.

## Finance Ledger Lifecycle

1. Subscription activation records ledger entries for income, prize allocation, charity allocation, and platform revenue.
2. Monthly draw publication records prize commitment for reconciliation.
3. Winner payout completion records payout outflow.
4. Admin reports expose ledger details and reconciliation checks.

## Scalability Path

- Move uploads to object storage (Supabase Storage or S3).
- Move draw publication to scheduled worker queue.
- Add webhook event persistence and idempotency table.
- Split modules into services if traffic or team size grows.
