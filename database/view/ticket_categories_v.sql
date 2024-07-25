create or replace view ticket_categories_v as
select 
   tc.category_id, --not visible in qui
   tc.category_name "Category",
   c.customer_name "Customer",
   u.user_id , --not visible in qui
   u.username  "User"
from 
   ticket_categories tc,
   customers c,
   users u
where 
   tc.customer_id  = c.customer_id 
and c.customer_id = u.customer_id 