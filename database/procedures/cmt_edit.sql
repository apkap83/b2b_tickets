create or replace procedure cmt_edit (
   in pnum_comment_id    numeric,
   in pvch_comment      varchar,
   in pnum_user_id      numeric,
   in pvch_api_user     varchar,
   in pvch_api_process  varchar,
   in pbln_debug_mode   boolean default false
)
as $$
begin 
   IF pnum_comment_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_comment_id [%], value not given', pnum_comment_id ;
      return;
   END IF;
   
   IF pnum_user_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_user_id [%], value not given', pnum_user_id ;
      return;
   END IF;
   
   IF NULLIF(TRIM(pvch_comment  ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_comment [%], value not given', pvch_comment  ;
      return;
   END IF;
   
   IF NULLIF(TRIM(pvch_api_user  ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_api_user [%], value not given', pvch_api_user  ;
      return;
   END IF;
   
   IF NULLIF(TRIM(pvch_api_process  ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_api_process [%], value not given', pvch_api_process  ;
      return;
   END IF;
   
   update ticket_comments 
      set 
         comment = pvch_comment,
         record_version = record_version + 0.1,
         last_update_date = clock_timestamp(),
         last_update_user = pvch_api_user,
         last_update_process = pvch_api_process
   where 
      comment_id = pnum_comment_id
   and comment_user_id = pnum_user_id;
end;
$$ language plpgsql;
