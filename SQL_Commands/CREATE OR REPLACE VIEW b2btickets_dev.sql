CREATE OR REPLACE VIEW b2btickets_dev.ticket_categories_v
AS SELECT tc.category_id,
    tc.category_name AS "Category",
    c.customer_name AS "Customer",
    u.user_id,
    u.username AS "User"
   FROM b2btickets_dev.ticket_categories tc,
    b2btickets_dev.customers c,
    b2btickets_dev.users u
  WHERE tc.customer_id = c.customer_id AND c.customer_id = u.customer_id;

  CREATE OR REPLACE VIEW b2btickets_dev.ticket_comments_v
AS SELECT tc.comment_id,
    tc.ticket_id,
    tc.comment_date AS "Comment date",
    u.username AS "Username",
    tc.comment AS "Comment",
    tc.is_closure
   FROM b2btickets_dev.ticket_comments tc,
    b2btickets_dev.users u
  WHERE tc.comment_user_id = u.user_id;


  -- b2btickets_dev.tickets_v source

CREATE OR REPLACE VIEW b2btickets_dev.tickets_v
AS SELECT t.ticket_id,
    c.customer_name AS "Customer",
    t.ticket_number AS "Ticket",
    t.title AS "Title",
    tc.category_name AS "Category",
    st.service_name AS "Service",
    t.equipment_id AS "Equipment",
    t.sid AS "Sid",
    t.cid AS "Cid",
    t.username AS "Username",
    t.cli AS "Cli",
    t.contact_person AS "Contact person",
    t.contact_phone_number AS "Contact phone number",
    t.occurrence_date AS "Occurence date",
    t.open_date AS "Opened",
    ou.username AS "Opened By",
    s.status_name AS "Status",
    t.status_date AS "Status Date",
    su.username AS "Status User",
    t.close_date AS "Closed",
    cu.username AS "Closed By"
   FROM b2btickets_dev.tickets t
     JOIN b2btickets_dev.service_types st ON t.service_id = st.service_id
     JOIN b2btickets_dev.customers c ON t.customer_id = c.customer_id
     JOIN b2btickets_dev.ticket_categories tc ON t.category_id = tc.category_id
     JOIN b2btickets_dev.statuses s ON t.status_id = s.status_id
     JOIN b2btickets_dev.users ou ON t.open_user_id = ou.user_id
     JOIN b2btickets_dev.users su ON t.open_user_id = su.user_id
     LEFT JOIN b2btickets_dev.users cu ON t.close_user_id = cu.user_id;



CREATE OR REPLACE VIEW b2btickets_dev.service_types_v
AS SELECT service_id,
    service_name AS "Service Name",
    start_date,
    end_date
   FROM b2btickets_dev.service_types;