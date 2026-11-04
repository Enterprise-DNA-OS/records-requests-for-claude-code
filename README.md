# Records Requests for Claude Code

Know which information requests are late, which departmental searches are still open, and which documents await an officer's decision. Keep the history in a database you own.

## Three ways to own it

- **Do it yourself:** use the free MIT-licensed base with Claude Code, Codex, OpenCode or Cursor. Hosting, an agent subscription and your time are separate costs.
- **We customise it:** Enterprise DNA maps your NextRequest export, changes fields and rules, connects existing systems, and builds a web front end or another stack when you need one. One setup fee, then a retainer for ongoing work.
- **We run it for you:** Omni by Enterprise DNA installs the system, sets up access and backups, prepares reviews and maintains it. One setup fee, then a retainer.

[Book a 30-minute call with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=nextrequest).

## Run the synthetic demo

Node 20 or newer. No cloud account is required.

```sh
npm install
npm test
npm run demo
npm run requests -- deadline-desk
npm run requests -- request --request=DEMO-101 --json
npm run requests -- compliance
npm run view
npm run docs
```

The invented demo has an overdue request, a late search, an outstanding review, a missing deadline and stale work. It contains no real requester details or documents. Repeated seeding preserves edits. Use a new DATA_DIR without seed data for real work.

## What you own

A request register, departmental search tasks, a document inventory, officer review outcomes, extension notices, response evidence, work minutes and append-only activity. Original due dates survive extensions. Imports retain the complete original CSV, selected mapping and every extra field. Imported deadlines stay unreviewed until an officer confirms their basis. Imported closures are flagged when response evidence is absent.

The CLI rejects closure while searches or document reviews remain open. A full-release outcome cannot contain a withheld or redacted record. It records a response already sent by an officer. It does not send, release files or calculate legal deadlines. Document hashes and reviewed-copy references describe evidence held elsewhere.

The useful replacement here is the internal information-request desk. NextRequest also supplies public intake, requester communications, redaction and disclosure tools. This base has no public portal, document redaction engine, email delivery, payment collection, authenticated multi-user access or statutory calendar. Scope those separately before replacing a live agency service.

## Recurring jobs

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

28 CLI commands and 30 slash commands. CLI flags use --name=value and all commands accept --json. /customise and /new-view are agent recipes.

## Ten questions your records answer

1. Which overdue requests still have departmental searches open? (`overdue`)
2. Which requests have documents waiting for an officer review? (`review-queue`)
3. Which departments hold the largest open backlog? (`department-load`)
4. Which request deadlines have no recorded basis? (`compliance`)
5. Which open requests have no recorded work for fourteen days? (`stale`)
6. Which searches are late and who owns them? (`search-queue`)
7. Which requests consumed the most recorded work minutes? (`time-summary`)
8. Which extension notices were recorded after the previous deadline? (`compliance`)
9. Which imported closed requests lack response evidence? (`compliance`)
10. Who recorded each deadline change and review decision? (`request`)

These are working analyses, not an unsupported claim that NextRequest cannot answer them. The difference is that you can join your evidence and change your own rules.

## Your first hour: ten things to ask for

1. Put our organisation's name and colours in brand.json.
2. Show the requests past their recorded deadlines.
3. Show every open search and its owner.
4. Show documents that still need a review.
5. Draft the Monday desk review.
6. Read one request's full evidence history.
7. Test our NextRequest CSV with explicit date and status mapping.
8. Compare imported counts and deadlines with NextRequest.
9. Add our internal team code with a tested migration.
10. Export a private snapshot before changing our rules.

## Switch from NextRequest

[The replace guide](docs/replace-nextrequest.md) follows CivicPlus's Requests Report export and documents the exact mapping. Import is one command after selecting and checking the report columns. Repeating an identical import is a no-op. Changed rows for an existing request are rejected to protect live work. The fixture is synthetic, not a captured customer export. Test an actual agency export before switching.

## Documents and views

Edit brand.json and run npm run view for the deadline desk, department workload and evidence checks. npm run docs writes branded request summaries, search instruction sheets and document review schedules to private HTML. These are internal working papers, not release packs. [Why no front end](docs/why-no-front-end.md) explains the screen and mobile limits.

## Compliance and operations

[Compliance checks](docs/compliance.md) link to NZ official information guidance. They identify missing evidence, missed dates, late extension notices and unverified closures. Officers determine applicable law, legal deadlines, withholding grounds, complaint rights and retention. No legal certification or automatic redaction is provided.

All domain tables enable row-level security and remove PUBLIC privileges. This is a trusted owner-connection tool, not a multi-tenant service. Restrict OS and database access. Protect exports, drafts and reports. Native database backups remain necessary. The complete JSON export is a portable snapshot; restore is reviewed maintenance, not an automated command.

npm test uses a disposable database and output folder. It tests every CLI command, import rollback, duplicate handling, deadline history, closure rules, evidence immutability and HTML escaping. CI is configured for Windows and Ubuntu with Node 20 and 22, plus PostgreSQL 16. TEST_DATABASE_URL must name an empty disposable database.

## Research and licence

[Research](docs/research.md) records the candidate scores, actual public-agency spending evidence and buyer-fit limits. The vendor publishes no numeric list price on the reviewed pricing route. MIT licence. Copyright 2026 Enterprise DNA. NextRequest belongs to CivicPlus. This independent implementation contains no vendor code or assets.
