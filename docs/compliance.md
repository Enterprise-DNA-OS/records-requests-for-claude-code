# Evidence checks for information officers

Checked 2026-11-04. The implemented checks concern recorded workflow evidence. They do not decide whether a request falls under a law, compute a statutory calendar, certify redactions or determine what may be disclosed.

| Check | What the system checks | Source and limit |
|---|---|---|
| Deadline evidence | Every open request has a due date, jurisdiction and recorded basis. | [NZ Ombudsman response guidance](https://www.ombudsman.parliament.nz/what-ombudsman-can-help/requests-official-information/make-request-official-information). NZ official information decisions are normally due as soon as reasonably practicable and within 20 working days. A stored date is not a legal calculation. |
| Response overdue | An open request's recorded due date is earlier than today in UTC. | Same source. Officers verify the local day, exceptions and applicable jurisdiction. |
| Extension notice timing | A recorded notice date is later than the previous recorded deadline. | [DPMC OIA guidance, section 8.37](https://www.dpmc.govt.nz/our-business-units/cabinet-office/supporting-work-cabinet/cabinet-manual/8-official-information-and-public-records/official-information-act-1982). Notice timing, grounds and review rights require officer review. |
| Closure evidence | Imported closed requests without a recorded response remain flagged. | Operational evidence control. Import status is not proof that a response was sent. |
| Response grounds and complaint notice | record-response requires a reason, authority, complaint-notice text, actual date and evidence reference. | [NZ Ombudsman refusal guidance](https://www.ombudsman.parliament.nz/what-ombudsman-can-help/requests-official-information/make-request-official-information). Refusals require reasons and advice about complaining. Presence checks cannot establish legal adequacy. |
| Reviewed documents | Every document has one recorded outcome before closure. A redaction decision requires a reviewed-copy reference. | Internal policy control, not a legal rule or a redaction engine. An officer inspects the actual file separately. |

Use the [Ombudsman's official calculators](https://www.ombudsman.parliament.nz/agency-assistance/official-information-calculators) and agency policy to determine NZ due dates. The guidance notes regional holidays need separate treatment. For Australia or US FOIA and state public-records laws, obtain the applicable agency rules and enter the reviewed dates and grounds. No universal deadline is assumed.

Original due dates remain unchanged when an extension is logged. Evidence, reviews and response records are append-only. An owner-level database user can bypass database protections. For corrections, retain the original and add a documented reviewed migration. Retention and legal-hold policies belong to the agency. Nothing here deletes records automatically. Request text can contain sensitive information. Use a protected installation and approved document storage.
