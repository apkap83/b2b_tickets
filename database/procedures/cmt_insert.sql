create or replace procedure cmt_insert (
   in pnum_ticket_id    numeric,
   in pvch_comment      varchar,
   in pvch_is_closure   varchar,
   in pnum_user_id      numeric,
   in pvch_api_user     varchar,
   in pvch_api_process  varchar,
   in pbln_debug_mode   boolean default false
)
as $$
declare 
   vch_is_closure varchar;
   num_comment_id numeric;
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
   
   IF NULLIF(TRIM(pvch_is_closure  ),'') IS NULL THEN
      RAISE EXCEPTION 'Invalid Argument pvch_is_closure [%], value not given', pvch_is_closure  ;
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
   
   if pvch_is_closure = 'y' then 
      vch_is_closure = 'y';
   else
      vch_is_closure = 'n';
   end if;
   
   num_comment_id = nextval('comments_sq') ;
   
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
      num_comment_id,
      pnum_ticket_id,
      clock_timestamp(),
      pnum_user_id,
      pvch_comment,
      vch_is_closure,
      1,
      clock_timestamp(),
      pvch_api_user,
      pvch_api_process
   );
end;
$$ language plpgsql;
