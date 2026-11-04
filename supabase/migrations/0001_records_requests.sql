CREATE FUNCTION touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Evidence records are append-only'; END $$;
CREATE TABLE imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), digest text UNIQUE NOT NULL, original_csv text NOT NULL,
 mapping jsonb NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text UNIQUE NOT NULL CHECK(trim(number)<>''),
 summary text NOT NULL CHECK(trim(summary)<>''), received_on date NOT NULL,
 original_due date, due_on date, deadline_basis text NOT NULL DEFAULT '', jurisdiction text NOT NULL DEFAULT 'UNREVIEWED',
 department text NOT NULL, owner text NOT NULL, state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closed')),
 imported_closed boolean NOT NULL DEFAULT false, source_status text, source_row jsonb, import_id uuid REFERENCES imports,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(original_due IS NULL OR original_due>=received_on), CHECK(due_on IS NULL OR due_on>=received_on)
);
CREATE TABLE search_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests,
 department text NOT NULL, owner text NOT NULL, scope text NOT NULL, due_on date NOT NULL,
 completed_on date, result text, evidence text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(completed_on IS NULL OR (length(trim(result))>0 AND length(trim(evidence))>0))
);
CREATE TABLE records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests,
 reference text NOT NULL, description text NOT NULL, pages integer NOT NULL CHECK(pages>0),
 source_ref text NOT NULL, checksum text NOT NULL CHECK(checksum ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(request_id,reference)
);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), record_id uuid NOT NULL REFERENCES records,
 disposition text NOT NULL CHECK(disposition IN ('release','redact','withhold')),
 authority text NOT NULL, reason text NOT NULL, reviewed_copy text NOT NULL DEFAULT '', actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(record_id), CHECK(disposition<>'redact' OR length(trim(reviewed_copy))>0)
);
CREATE TABLE extensions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests,
 old_due date, new_due date NOT NULL, reason text NOT NULL, authority text NOT NULL,
 notified_on date NOT NULL, notice_ref text NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(old_due IS NULL OR new_due>old_due)
);
CREATE TABLE responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid UNIQUE NOT NULL REFERENCES requests,
 outcome text NOT NULL CHECK(outcome IN ('full','partial','refused','withdrawn','transferred')),
 reason text NOT NULL, authority text NOT NULL, complaint_notice text NOT NULL,
 sent_on date NOT NULL, evidence text NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE time_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests,
 worked_on date NOT NULL, minutes integer NOT NULL CHECK(minutes>0 AND minutes<=1440),
 task text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid REFERENCES requests,
 action text NOT NULL, actor text NOT NULL, detail jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['imports','requests','search_tasks','records','reviews','extensions','responses','time_entries','activity'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['imports','records','reviews','extensions','responses','time_entries','activity'] LOOP
 EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION immutable_record()',t);
 END LOOP;
END $$;
CREATE INDEX task_request ON search_tasks(request_id);
CREATE INDEX record_request ON records(request_id);
CREATE INDEX activity_request ON activity(request_id);
CREATE VIEW deadline_desk AS
 SELECT r.id,r.number,r.summary,r.department,r.owner,r.received_on,r.due_on,
 r.due_on-current_date AS days_left,
 (SELECT count(*)::integer FROM search_tasks t WHERE t.request_id=r.id AND t.completed_on IS NULL) AS searches_open,
 (SELECT count(*)::integer FROM records d LEFT JOIN reviews v ON v.record_id=d.id WHERE d.request_id=r.id AND v.id IS NULL) AS reviews_open
 FROM requests r WHERE r.state='open';
CREATE VIEW search_queue AS
 SELECT t.id,r.number,t.department,t.owner,t.scope,t.due_on,t.due_on-current_date AS days_left
 FROM search_tasks t JOIN requests r ON r.id=t.request_id WHERE t.completed_on IS NULL AND r.state='open';
CREATE VIEW review_queue AS
 SELECT d.id,r.number,d.reference,d.description,d.pages,d.source_ref
 FROM records d JOIN requests r ON r.id=d.request_id LEFT JOIN reviews v ON v.record_id=d.id
 WHERE v.id IS NULL AND r.state='open';
CREATE VIEW compliance_findings AS
 SELECT id AS request_id,number,'deadline evidence'::text AS rule,'Record a reviewed jurisdiction, due date and deadline basis'::text AS finding
 FROM requests WHERE state='open' AND (due_on IS NULL OR deadline_basis='' OR jurisdiction='UNREVIEWED')
 UNION ALL SELECT id,number,'response overdue','Recorded due date has passed without a response' FROM requests WHERE state='open' AND due_on<current_date
 UNION ALL SELECT r.id,r.number,'extension notice timing','Notice date is after the previous recorded deadline' FROM extensions e JOIN requests r ON r.id=e.request_id WHERE e.notified_on>e.old_due
 UNION ALL SELECT r.id,r.number,'closure evidence','Imported closed status has no independently recorded response evidence' FROM requests r LEFT JOIN responses s ON s.request_id=r.id WHERE r.state='closed' AND s.id IS NULL;
