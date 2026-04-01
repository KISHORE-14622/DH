# Data Model (MongoDB)

## users

- name: String
- email: String (unique)
- passwordHash: String
- role: subscriber | admin
- subscription:
- plan: monthly | yearly
- status: inactive | active | canceled | lapsed
- renewalDate: Date
- stripeCustomerId: String
- stripeSubscriptionId: String
- charitySelection:
- charityId: ObjectId (Charity)
- contributionPercentage: Number (min 10)
- scores: [{ score, playedAt }]
- winningsTotal: Number

Business rules:
- Score value must be between 1 and 45.
- Keep only latest 5 scores sorted by playedAt descending.

## charities

- name: String
- description: String
- imageUrl: String
- upcomingEvents: String[]
- featured: Boolean
- active: Boolean

## drawruns

- monthKey: String (unique, format YYYY-MM)
- mode: random | algorithmic
- winningNumbers: Number[]
- simulated: Boolean
- publishedAt: Date
- winnerCounts: { match5, match4, match3 }
- prizePool: { total, tier5, tier4, tier3, rollover }

## winnerrecords

- drawRunId: ObjectId (DrawRun)
- userId: ObjectId (User)
- matchCount: 3 | 4 | 5
- prizeAmount: Number
- verificationStatus: pending | approved | rejected
- payoutStatus: pending | paid
- proofUrl: String
- reviewNote: String
- approvedAt: Date
- paidAt: Date

Constraints:
- Unique index on (drawRunId, userId)
- Mark paid only after approved verification
