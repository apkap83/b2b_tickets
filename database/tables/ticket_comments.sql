create table ticket_comments (
    comment_id numeric not null,
    ticket_id numeric not null,
    comment_date timestamp not null,
    comment_user_id numeric not null,
    comment varchar(4000) not null,
    is_closure varchar(1) not null,
    
    -- audit columns
    record_version numeric not null,
    creation_date timestamp not null,
    creation_user varchar(150) not null,
    last_update_date timestamp,
    last_update_user varchar(150),
    last_update_process varchar(250) not null,
    primary key (comment_id)
)

//

create sequence comments_sq

//

alter table ticket_comments
add constraint cmt_chk1
check (is_closure in ('y', 'n'))

//

alter table ticket_comments
add constraint cmt_tck_fk
foreign key (ticket_id)
references tickets (ticket_id)


//

create index cmt_tck_fki on ticket_comments (ticket_id)


//
alter table ticket_comments
add constraint cmt_usr_fk
foreign key (comment_user_id)
references users (user_id)

//

create index cmt_usr_fki on ticket_comments (comment_user_id)
