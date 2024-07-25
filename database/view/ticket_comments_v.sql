create or replace view ticket_comments_v as 
select 
   tc.comment_id,
   tc.ticket_id,
   tc.comment_date "Comment date",
   u.username "Username",
   tc.comment "Comment",
   tc.is_closure
from 
   ticket_comments tc,
   users u 
where 
   tc.comment_user_id = u.user_id