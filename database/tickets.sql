create table tickets (
    ticket_id numeric not null,
    customer_id numeric not null,
    ticket_number varchar(50) not null,
    title varchar(500) not null,
    description varchar(4000) not null,
    category_id numeric not null,
    service_id numeric not null,
    equipment_id numeric not null,
    open_date timestamp not null,
    open_user_id numeric not null,
    status_id numeric not null,
    status_date timestamp not null,
    status_user_id numeric not null,
    close_date timestamp,
    close_user_id numeric,
    root_cause varchar(4000),
    
    -- audit columns
    record_version numeric not null,
    creation_date timestamp not null,
    creation_user varchar(150) not null,
    last_update_date timestamp,
    last_update_user varchar(150),
    last_update_process varchar(250) not null,
    primary key (ticket_id)
)

//

create sequence tickets_sq

//

create unique index tck_uk1  on tickets (upper(ticket_number))

//

alter table tickets
add constraint tck_cust_fk
foreign key (customer_id)
references customers (customer_id)

//

create index tck_cust_fki on tickets (customer_id)

//

alter table tickets
add constraint tck_ousr_fk
foreign key (open_user_id)
references users (user_id)

//

create index tck_ousr_fki on tickets (open_user_id)

//

alter table tickets
add constraint tck_sts_fk
foreign key (status_id)
references statuses (status_id)

//

create index tck_sts_fki on tickets (status_id)

//

alter table tickets
add constraint tck_susr_fk
foreign key (status_user_id)
references users (user_id)

//

create index tck_susr_fki on tickets (status_user_id)

//

alter table tickets
add constraint tck_cusr_fk
foreign key (close_user_id)
references users (user_id)

//

create index tck_cusr_fki on tickets (close_user_id)

