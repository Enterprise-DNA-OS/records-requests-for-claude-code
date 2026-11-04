# /import

Validate and import a NextRequest Requests Report CSV.

Read CLAUDE.md first. Run `npm run requests -- import nextrequest --json` with the required flags shown by `npm run requests -- help`. Supported flags: --file, --map, --date-format, --dry-run, --actor.

Read the request first. Use the operator-provided actor and evidence. Only record the change the operator has instructed. Never invent missing fields.

Read docs/replace-nextrequest.md. Start with --dry-run and compare request counts and dates. Unknown statuses and ambiguous date formats must be mapped explicitly.



Present the result in plain words. List candidates when ambiguous and obtain the exact id. Keep generated material private. Drafts never send.
