# Security Specification: CryptoEdge

## Data Invariants
- A user can only access their own profile at `/users/{userId}`.
- A user can only access their own trade history at `/users/{userId}/trades/{tradeId}`.
- A user can only access their own bots at `/users/{userId}/bots/{botId}`.
- Signals at `/signals/{signalId}` are readable by any authenticated user but can only be created/modified by the system (admin).
- Sensitive fields like `userId` and `createdAt` must be immutable.

## The "Dirty Dozen" Payloads (Blocked)
1. **Identity Theft**: User A tries to read User B's `/users/{userId}` profile.
2. **Key Scraping**: User A tries to list all documents in `/users` collection.
3. **Bot Hijacking**: User A tries to update User B's `/users/{userId}/bots/{botId}` isActive state.
4. **Trade Forgery**: User A tries to create a trade in User B's history.
5. **Signal Manipulation**: User A tries to create a fake Signal in the `/signals` collection.
6. **Shadow Field Injection**: User A tries to add a `isVerifiedAdmin: true` field to their profile.
7. **Resource Poisoning**: User A tries to set a 2MB string as a bot name.
8. **Invalid State Transition**: User A tries to update a "closed" trade back to "open".
9. **Ownership Spoofing**: User A tries to create a bot with `userId` set to User B's UID.
10. **PII Leak**: User A tries to query all emails in the `/users` collection.
11. **Timestamp Faking**: User A tries to set a manual `timestamp` from the past.
12. **Orphaned Bot**: User A tries to create a bot without a corresponding user profile.

## Test Runner
See `firestore.rules.test.ts` for detailed implementation of these tests.
