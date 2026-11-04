INSERT INTO requests(id,number,summary,received_on,original_due,due_on,deadline_basis,jurisdiction,department,owner) VALUES
 ('10000000-0000-4000-8000-000000000001','DEMO-101','Harbour walkway maintenance records',current_date-35,current_date-3,current_date-3,'Synthetic date approved for demo','NZ-LGOIMA','Facilities','Mira'),
 ('10000000-0000-4000-8000-000000000002','DEMO-102','Park planting expenditure',current_date-12,current_date+4,current_date+4,'Synthetic date approved for demo','NZ-LGOIMA','Parks','Leo'),
 ('10000000-0000-4000-8000-000000000003','DEMO-103','Park inspection correspondence',current_date-18,NULL,NULL,'','UNREVIEWED','Parks','Mira'),
 ('10000000-0000-4000-8000-000000000004','DEMO-104','Historic community hall bookings',current_date-70,current_date-40,current_date-40,'Synthetic date','NZ-LGOIMA','Facilities','Leo') ON CONFLICT DO NOTHING;
INSERT INTO search_tasks(id,request_id,department,owner,scope,due_on) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Facilities','Ari','Search maintenance register and contractor correspondence',current_date-5),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Parks','Ari','Search planting purchase records',current_date+2) ON CONFLICT DO NOTHING;
INSERT INTO records(id,request_id,reference,description,pages,source_ref,checksum) VALUES
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','FAC-01','Walkway condition report',6,'demo://facilities/condition',repeat('a',64)),
 ('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','PARK-01','Planting schedule',3,'demo://parks/planting',repeat('b',64)) ON CONFLICT DO NOTHING;
INSERT INTO reviews(record_id,disposition,authority,reason,reviewed_copy,actor)
 VALUES('30000000-0000-4000-8000-000000000002','redact','Demo review policy','Synthetic staff contact details removed','demo://reviewed/planting','Mira') ON CONFLICT DO NOTHING;
INSERT INTO time_entries(id,request_id,worked_on,minutes,task,actor) VALUES
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',current_date-1,45,'Search correspondence','Ari'),
 ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',current_date-1,30,'Review planting schedule','Mira') ON CONFLICT DO NOTHING;
