create or replace view service_types_v as
select 
   service_id,
   service_name "Service Name",
   start_date,
   end_date
from 
   service_types