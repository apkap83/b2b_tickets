CREATE OR REPLACE PROCEDURE tck_ticket_status_update(
   in pnum_ticket_id    numeric,
   in pnum_status_id    numeric,
   in pnum_user_id      numeric,
   in pvch_root_cause   varchar,
   in pvch_api_user     varchar,
   in pvch_api_process  varchar,
   in pbln_debug_mode   boolean default false
)
AS $$
declare 
   vnum_comment_id numeric;
begin
   
   IF pnum_ticket_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_ticket_id [%], value not given', pnum_ticket_id ;
      return;
   END IF;
   
   IF pnum_status_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_status_id [%], value not given', pnum_status_id ;
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
   
   if pnum_status_id = 4 then 
      if nullif(trim(pvch_root_cause), '') is null then 
         RAISE EXCEPTION 'Invalid Argument pvch_root_cause [%], value not given, in closing ticket', pvch_description ;
         return;
      end if;
   end if;
   
   if pnum_status_id = 4 then 
      update tickets 
      set
         status_id = pnum_status_id,
         status_date = clock_timestamp(),
         status_user_id = pnum_user_id,
         close_date = clock_timestamp(),
         close_user_id = pnum_user_id,
         record_version = record_version + 0.1,
         last_update_date = clock_timestamp(),
         last_update_user = pvch_api_user,
         last_update_process = pvch_api_process
      where 
         ticket_id = pnum_ticket_id;
         
         --todo insert comment
         vnum_comment_id = nextval('comments_sq');
         
         insert into ticket_comments (
            comment_id,
            ticket_id,
            comment_date,
            comment_user_id,
            comment,
            is_closure,
            record_version,
            creation_date,
            creation_user,
            last_update_process
         ) values (
            vnum_comment_id,
            pnum_ticket_id,
            clock_timestamp(),
            pnum_user_id,
            pvch_root_cause,
            'y',
            1,
            clock_timestamp(),
            pvch_api_user,
            pvch_api_process
         );
   else 
      update tickets 
      set
         status_id = pnum_status_id,
         status_date = clock_timestamp(),
         status_user_id = pnum_user_id,
         record_version = record_version + 0.1,
         last_update_date = clock_timestamp(),
         last_update_user = pvch_api_user,
         last_update_process = pvch_api_process
      where 
         ticket_id = pnum_ticket_id;
   end if;

END;
$$ LANGUAGE plpgsql;