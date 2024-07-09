drop function tck_ticket_new

//


CREATE OR REPLACE FUNCTION tck_ticket_new(
   in pvch_title varchar,
   in pvch_description varchar,
   in pnum_category_id numeric,
   in pnum_service_id numeric,
   in pnum_equipment_id numeric,
   in pnum_user_id numeric,
   in pvch_api_user varchar,
   in pvch_api_process varchar,
   in pbln_debug_mode boolean default false
)
RETURNS numeric AS $$
DECLARE
   vnum_ticket_id numeric;
   vnum_customer_id numeric;
   vch_customer_code varchar;
   vch_ticket_number varchar;
begin
   
   IF NULLIF(TRIM(pvch_description ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_description [%], value not given', pvch_description ;
      return null;
   END IF;
   
   IF NULLIF(TRIM(pvch_title ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_title [%], value not given', pvch_title ;
      return null;
   END IF;
   
   IF pnum_category_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_category_id [%], value not given', pnum_category_id ;
      return null;
   END IF;
   
   IF pnum_user_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_user_id [%], value not given', pnum_user_id ;
      return null;
   END IF;
   
   IF NULLIF(TRIM(pvch_api_user ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_api_user [%], value not given', pvch_api_user ;
      return null;
   END IF;
   
   IF NULLIF(TRIM(pvch_api_process  ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_api_process [%], value not given', pvch_api_process  ;
      return null;
   END IF;
   
   vnum_ticket_id = nextval('tickets_sq');
 
   select 
      c.customer_id ,
      upper(c.customer_code)
   into 
      vnum_customer_id,
      vch_customer_code
   from 
      users u,
      customers c
   where 
      u.customer_id = c.customer_id
   and u.user_id = pnum_user_id;

   vch_ticket_number = vch_customer_code || lpad(vnum_ticket_id::text, 6, '0');
    
   --todo in debug mode
   if pbln_debug_mode  = true then
      raise notice 'ticket_id: [%], user_id: [%], customer_id [%], customer_code: [%], ticket_number: [%], vch_category_id: [%]',
        vnum_ticket_id,
        pnum_user_id ,
        vnum_customer_id,
        vch_customer_code,
        vch_ticket_number,
        pnum_category_id ;
   end if;
     
   insert into tickets (
      ticket_id,
      customer_id,
      ticket_number,
      title,
      description,
      category_id,
      service_id,
      equipment_id,
      open_date,
      open_user_id,
      status_id,
      status_date,
      status_user_id,
      record_version,
      creation_date,
      creation_user,
      last_update_process 
   ) values (
      vnum_ticket_id,
      vnum_customer_id,
      vch_ticket_number,
      pvch_title,
      pvch_description,
      pnum_category_id ,
      pnum_service_id,
      pnum_equipment_id,
      clock_timestamp(),
      pnum_user_id ,
      1,
      clock_timestamp(),
      pnum_user_id ,
      1,
      clock_timestamp() ,
      pvch_api_user ,
      pvch_api_process 
   );

   RETURN vnum_ticket_id;
END;
$$ LANGUAGE plpgsql;