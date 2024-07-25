create or replace procedure cmt_add_closure (
   in pnum_ticket_id    numeric,
   in pvch_comment      varchar,
   in pnum_user_id      numeric,
   in pvch_api_user     varchar,
   in pvch_api_process  varchar,
   in pbln_debug_mode   boolean default false
)
as $$
begin 
   IF pnum_ticket_id IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pnum_ticket_id [%], value not given', pnum_ticket_id ;
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
   
   call cmt_insert(
                     pnum_ticket_id,
                     pvch_comment,
                     'y',
                     pnum_user_id,
                     pvch_api_user,
                     pvch_api_process,
                     pbln_debug_mode);
end;
$$ language plpgsql;
