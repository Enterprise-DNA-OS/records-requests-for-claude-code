# Records Requests for Claude Code

An internal records request desk for information officers: intake, deadlines, departmental searches, document review evidence and response records. The database is the source of truth.

## Operating rules

Read current records before answering. Identify the intended organisation and actor with the operator. All commands accept --json and --name=value flags. Dates are ISO YYYY-MM-DD. Day boundaries use UTC, so check the agency's local date when recording evidence.

Never send messages, disclose documents, publish requests, process fees or choose legal grounds. Drafts stay in drafts/. An officer sets the jurisdiction, deadline and evidence. record-response records a response already sent elsewhere. extend records a notice already issued. A reviewed copy reference is not proof of successful redaction. Inspect the actual file in an approved document tool.

Actor names are labels, not authentication. Use a trusted local operator or protected owner connection. Keep confidential documents in the agency's approved store, outside this repository. No data, exports, generated reports or secrets belong in git. Never seed a production database. No automatic deletion exists. Correct append-only evidence through a reviewed migration with a preserved correction history.

## One route per job

| Command | Purpose |
|---|---|
| /help | List the supported commands and flags. |
| /requests | Read the request register. |
| /request | Read one request and all its evidence. |
| /deadline-desk | Review deadlines, open searches and outstanding reviews. |
| /overdue | Find requests past their recorded response date. |
| /search-queue | Chase outstanding departmental searches. |
| /review-queue | Read the documents awaiting an officer decision. |
| /stale | Find open requests without recorded work for over fourteen days. |
| /department-load | Compare open and overdue requests by department. |
| /time-summary | Read recorded work minutes by request. |
| /compliance | Check deadline evidence, late notices and unverified closures. |
| /activity | Read the append-only operational history. |
| /add-request | Record an incoming request. |
| /set-deadline | Confirm a deadline and its legal or policy basis. |
| /assign-search | Assign a scoped departmental search. |
| /complete-search | Record the completed search and its evidence. |
| /add-record | Register a document reference, page count and checksum. |
| /review-record | Record an authorised document review outcome. |
| /extend | Record an extension notice already issued outside this tool. |
| /record-response | Record a response already sent and close its request. |
| /log-time | Record work minutes without calculating a charge. |
| /log-note | Record progress with a named actor. |
| /import | Validate and import a NextRequest Requests Report CSV. |
| /export | Write a complete private snapshot to a new file. |
| /weekly-review | Draft the weekly review from three current reports. |
| /draft-ack | Draft an acknowledgement for internal review. |
| /draft-search | Draft a departmental search instruction. |
| /draft-response | Draft an internal response working sheet. |
| /customise | Change a field or rule with a tested migration. |
| /new-view | Add a branded read-only report. |

Exact request numbers take precedence over partial ids and case-insensitive description matches. Ambiguity lists candidates and exits 1. Read docs/replace-nextrequest.md before import and docs/compliance.md before interpreting findings.

## Files

The single CLI is scripts/requests.mjs. Numbered migrations live in supabase/migrations. DATABASE_URL selects PostgreSQL. Otherwise DATA_DIR selects PGlite storage, default .data/db. brand.json controls generated reports. views.json and documents.json specify read-only output. Run npm test after domain changes.

Built and run through Omni by Enterprise DNA. https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=nextrequest
