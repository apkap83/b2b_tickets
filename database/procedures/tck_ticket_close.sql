
CREATE OR REPLACE PROCEDURE tck_ticket_close(
   in pnum_ticket_id    numeric,
   in pnum_user_id      numeric,
   in pvch_root_cause   varchar,
   in pvch_api_user     varchar,
   in pvch_api_process  varchar,
   in pbln_debug_mode   boolean default false
)
AS $$
begin
   
   IF pnum_ticket_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_ticket_id [%], value not given', pnum_ticket_id ;
      return;
   END IF;
   
   IF pnum_user_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_user_id [%], value not given', pnum_user_id ;
      return;
   END IF;
   
   IF NULLIF(TRIM(pvch_api_user ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_api_user [%], value not given', pvch_api_user ;
      return;
   END IF;
   
   IF NULLIF(TRIM(pvch_api_process  ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_api_process [%], value not given', pvch_api_process  ;
      return;
   END IF;
   
   
   if nullif(trim(pvch_root_cause), '') is null then 
      RAISE EXCEPTION 'Invalid Argument pvch_root_cause [%], value not given, in closing ticket', pvch_description ;
      return;
   end if;
   
   call tck_ticket_status_update(
      pnum_ticket_id,
      4,
      pnum_user_id,
      pvch_root_cause,
      pvch_api_user,
      pvch_api_process,
      pbln_debug_mode 
   );

END;
$$ LANGUAGE plpgsql;