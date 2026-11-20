# VibeWorking Security Specification (Payload-First TDD)

## 1. Core Data Invariants
1. **PII Isolation**: Private user data (`email`, `dob`, `parentEmail`, `walletBalance`) resides in `/users/{userId}` and is readable ONLY by `userId` or an admin. Public showcases reside in `/profiles/{userId}` with zero PII.
2. **Privilege Escalation Prevention**: Users can only toggle `role` between `'freelancer'` and `'client'`. Admin privileges are verified strictly via `/admins/{uid}` or verified bootstrap admin email (`email_verified == true`).
3. **COPPA & Teen Safety Gate**:
   - Users under 13 (`accountStatus == 'blocked_coppa'`) or waiting on parent approval (`accountStatus == 'pending_parental_consent'`) CANNOT create jobs, submit bids, or send messages.
   - A teen (`13_17`) cannot self-approve `parentalConsentStatus: 'approved'` on `/users/{userId}`.
4. **Escrow Integrity**:
   - Contracts can only be created when a valid open job and bid exist, and only by the job's `clientId`.
   - Freelancer cannot approve their own milestone or increase `releasedAmount` directly.
   - Client cannot pull funds back after `escrowFunded == true` unless an admin resolves a dispute.
   - Terminal contract states (`completed`, `resolved`, `cancelled`) are locked against non-admin mutations.
5. **Chat & Review Integrity**:
   - Only `clientId` and `freelancerId` of a `/chats/{chatId}` room can read/list/send messages in `/chats/{chatId}/messages/{messageId}`.
   - Reviews are immutable once created (`authorId == request.auth.uid`), with only a single reply allowed by `targetUserId` and moderation (`isHidden`) restricted to admins.

## 2. "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Shadow Field Injection on Profile**: Create `/profiles/{uid}` with extra `isAdmin: true` ghost field.
2. **Teen Self-Approval**: User updates `/users/{uid}` changing `parentalConsentStatus` from `'pending'` to `'approved'` and `idVerified: true`.
3. **PII Scraping**: Signed-in user B calls `get` or `list` on `/users` to read user A's `email` and `dob`.
4. **Unverified Email Spoofing**: User with `email_verified: false` attempts to write to `/jobs/{jobId}`.
5. **Underage / Pending Teen Bidding**: User with `accountStatus: 'pending_parental_consent'` attempts to create `/bids/{bidId}`.
6. **Bid Impersonation**: Freelancer B submits `/bids/{bidId}` with `freelancerId: freelancerA_uid`.
7. **Freelancer Self-Approve Milestone**: Freelancer updates `/contracts/{contractId}` setting `releasedAmount: 500` and milestone `status: 'approved'`.
8. **Client Post-Approve Clawback**: Client updates `/contracts/{contractId}` after milestone approval trying to reduce `releasedAmount` back to `0`.
9. **Terminal Contract Tampering**: Participant updates `/contracts/{contractId}` when `status == 'completed'`.
10. **Chat Eavesdropping**: Third-party user C reads `/chats/{chatId}/messages/{msgId}` where C is neither `clientId` nor `freelancerId`.
11. **Review Manipulation**: Author updates `/reviews/{reviewId}` to change `rating` from `2` to `5` after posting.
12. **Resource Exhaustion / ID Poisoning**: User creates `/jobs/{200_char_invalid_id}` or injects a 50KB title string.
