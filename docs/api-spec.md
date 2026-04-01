# API Contract (MVP)

Base URL: /api

## Auth

- POST /auth/register
- body: { name, email, password }
- returns: { token }
- side effect: welcome email event logged/sent

- POST /auth/login
- body: { email, password }
- returns: { token }

- GET /auth/me
- auth: required
- returns: { user }

## Subscriptions

- POST /subscriptions/checkout-session
- auth: required
- body: { plan: monthly|yearly }
- returns: { url }

- POST /subscriptions/webhook
- source: Stripe
- updates user subscription status from Stripe events
- side effect: subscription status email event logged/sent
- note: dedicated raw-body route for Stripe signature verification

- POST /subscriptions/cancel
- auth: required
- cancels at period end in Stripe

- POST /subscriptions/mock-activate
- auth: required
- body: { plan }
- dev helper only

- POST /subscriptions/mock-lapse
- auth: required
- dev helper only

## Scores

- GET /scores
- auth: required + active subscription

- POST /scores
- auth: required + active subscription
- body: { score, playedAt(ISO string) }

- PUT /scores/:id
- auth: required + active subscription
- body: { score, playedAt(ISO string) }

## Draws

- POST /draws/simulate
- auth: admin
- body: { mode: random|algorithmic }

- POST /draws/publish
- auth: admin
- body: { mode: random|algorithmic }
- side effect: draw-result emails to active subscribers and winner-alert emails to winners

- GET /draws/latest
- auth: required

## Winners

- GET /winners/me
- auth: required

- POST /winners/:id/proof
- auth: required
- form-data: proof file

- GET /winners/admin
- auth: admin

- POST /winners/:id/review
- auth: admin
- body: { decision: approve|reject, reviewNote }
- side effect: review result email to subscriber

- POST /winners/:id/mark-paid
- auth: admin
- side effect: payout confirmation email to subscriber

## Charities

- GET /charities
- public

- POST /charities
- auth: admin
- body: { name, description, imageUrl?, upcomingEvents?, featured? }

- POST /charities/select
- auth: required
- body: { charityId, contributionPercentage }

## Dashboard

- GET /dashboard/me
- auth: required
- returns subscription, scores, charity selection, winnings summary, latest draw

## Reports

- GET /reports/summary
- auth: admin
- returns total users, active subscribers, total prize pool, verification queue summary

- GET /reports/charities
- auth: admin
- returns grouped charity selection and contribution averages

- GET /reports/draws
- auth: admin
- returns recent published draw summaries

- GET /reports/notifications
- auth: admin
- returns notification delivery status summary and recent logs

- GET /reports/ledger
- auth: admin
- returns recent financial ledger entries

- GET /reports/reconciliation
- auth: admin
- returns financial totals and reconciliation checks
