drop view tickets_v

//
create or replace view tickets_v as
select 
   t.ticket_id, --not visible in gui
   c.customer_name "Customer",
   t.ticket_number "Ticket",
   t.title "Title",
   tc.category_name "Category",
   st.service_name "Service", --για όταν έχουμε data
   t.equipment_id "Equipment", --για όταν έχουμε data,
   t.sid "Sid",
   t.cid "Cid",
   t.username "Username",
   t.cli "Cli",
   t.contact_person "Contact person",
   t.contact_phone_number "Contact phone number",
   t.occurrence_date "Occurence date",
   t.open_date "Opened",
   ou.username "Opened By",
   s.status_name "Status",
   t.status_date "Status Date",
   su.username "Status User",
   t.close_date "Closed",
   cu.username "Closed By"
from 
   tickets t
   inner join service_types st
      on t.service_id = st.service_id
   inner join customers c
      on t.customer_id = c.customer_id 
   inner join ticket_categories tc
      on t.category_id = tc.category_id
   inner join statuses s
      on t.status_id = s.status_id
   inner join users ou
      on t.open_user_id = ou.user_id
   inner join users su
      on t.open_user_id = su.user_id 
   left outer join users cu
      on t.close_user_id = cu.user_id