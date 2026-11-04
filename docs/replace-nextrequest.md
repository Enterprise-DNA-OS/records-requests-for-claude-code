# Move a request register from NextRequest

Source checked 2026-11-04: [CivicPlus Requests Report](https://www.civicplus.help/nextrequest/docs/requests-report). The vendor documents CSV and XLSX downloads, selectable report fields and optional request filters.

## Export

Sign in with access to the full intended request scope. Open All Requests. Remove filters unless intentionally migrating a subset. Choose Run Report, select request identifiers, descriptions, received dates, due dates, status, department and responsible staff, then download CSV. A saved report preserves selected fields, but filters must be reapplied for every run. Retain the untouched original privately.

## Map and validate

Report columns are configurable. The fixture shows a supported synthetic layout, not a guaranteed vendor header list. Read the actual export and set fixtures/column-map.json's fields to its exact headings. Copy that mapping into a private working location. The fields are number, summary, received, due, department, owner and status. map.statuses maps each actual source status to open or closed. Unknown statuses fail. Do not map pending review to closed.

Default aliases are Request Number / Request ID / Number, Request Text / Request Description / Description, Date Received / Received At / Created At / Submitted At, Due Date / Due At, Department, Staff / Assigned To / Owner, and Status. Identifiers remain text. Date columns must be calendar dates. Convert timestamp columns to the agency's intended calendar dates before import and retain the original export separately. ISO dates work directly. Slash dates require an explicit mdy or dmy format.

```sh
npm run requests -- import nextrequest --file=fixtures/nextrequest-report.csv --map=fixtures/column-map.json --actor=Officer --dry-run --json
npm run requests -- import nextrequest --file=fixtures/nextrequest-report.csv --map=fixtures/column-map.json --actor=Officer --json
```

The first command validates the whole batch inside a rolled-back transaction. The second commits it atomically. All extra columns, original CSV text and mapping remain in the database. Empty due dates and missing ownership are shown for review. The tool does not guess holidays or legal deadlines. Identical imports do nothing. Existing changed requests fail the whole batch instead of overwriting operational evidence.

## Reconcile

Compare request counts, unique identifiers, open/closed counts, department totals, received dates and due dates with the source. Review every imported deadline's jurisdiction and basis using set-deadline. An existing date cannot change through that command. Extensions require a separate evidenced notice. Corrections need a reviewed migration with preserved history. Imported closed requests remain flagged because a status alone is not proof of response.

## What stays separate

A Requests Report is not a complete account archive. Document binaries, redacted copies, message history, portal permissions, search tasks, fee payments and workflow configuration are not reconstructed from it. Retain those archives in an approved store and record references after review. [CivicPlus's document download guide](https://www.civicplus.help/nextrequest/docs/download-your-records) describes requester-accessible downloads, not an administrator bulk migration promise.

Run both systems until an information officer has reconciled the records and confirmed how intake, notices, document review and delivery will work. This base never publishes or sends. Enterprise DNA can build the required connections and screens into a scoped version. Exporting one clean report can fit into a day; moving a complete public service needs an acceptance plan.
