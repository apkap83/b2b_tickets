create table users (
    user_id numeric not null,
    customer_id numeric not null,
    username varchar(50) not null,
    password varchar(4000) not null,
    password_change_date timestamp  not null,
    change_password varchar(1) not null,
    is_locked varchar(1) not null,
    locked_reason varchar(4000),
    last_login_attempt timestamp not null,
    last_login_status varchar(1) not null,
    last_login_failed_attempts numeric,
    -- audit columns
    record_version numeric not null,
    creation_date timestamp not null,
    creation_user varchar(150) not null,
    last_update_date timestamp,
    last_update_user varchar(150),
    last_update_process varchar(250) not null,
    primary key (user_id)
)

//

create sequence  users_sq

//

alter table  users
add constraint usr_cust_fk
foreign key (customer_id)
references customers (customer_id)

//

create index usr_cust_fki on users (customer_id)

//

create unique index usr_uk1  on users (customer_id, upper(username))

//

alter table users
add constraint usr_chk1 check (change_password in ('y', 'n'))

//

alter table users
add constraint usr_chk2 check (is_locked in ('y', 'n'))

//

alter table users
add constraint usr_chk3 check (last_login_status in ('s', 'f', 'i'))

//

insert into users (
   user_id,
   customer_id ,
   username,
   password,
   password_change_date ,
   change_password ,
   is_locked ,
   last_login_attempt ,
   last_login_status,
   record_version,
   creation_date,
   creation_user,
   last_update_date,
   last_update_process 
) values (
    nextval('users_sq') ,
   -1 ,
   'admin',
   'password',
   clock_timestamp() ,
   'n',
   'n',
   to_date('01/01/1970 00:00:00', 'dd/mm/yyyy hh24:mi:ss') ,
   'i',
   1,
   clock_timestamp() ,
   'ypol',
   clock_timestamp(),
   'initial' 
)