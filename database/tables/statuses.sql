reate table statuses (
    status_id numeric not null,
    status_name varchar(50) not null,
    is_new varchar(1) not null,
    is_final varchar(1) not null,
    
    -- audit columns
    record_version numeric not null,
    creation_date timestamp not null,
    creation_user varchar(150) not null,
    last_update_date timestamp,
    last_update_user varchar(150),
    last_update_process varchar(250) not null,
    primary key (status_id)
)

//

create unique index sts_uk1  on statuses (upper(status_name))

//

alter table statuses
add constraint sts_chk1 check (is_new in ('y', 'n'))

//

alter table statuses
add constraint sts_chk2 check (is_final in ('y', 'n'))

//

insert into statuses (
    status_id, 
    status_name,
    is_new,
    is_final,
    record_version,
    creation_date,
    creation_user,
    last_update_date,
    last_update_process
) values (
    1,
    'New',
    'y',
    'n',
    1,
    clock_timestamp(),
    'ypol',
    clock_timestamp(),
    'initial'
)

//


insert into statuses (
    status_id, 
    status_name,
    is_new,
    is_final,
    record_version,
    creation_date,
    creation_user,
    last_update_date,
    last_update_process
) values (
    2,
    'Working',
    'n',
    'n',
    1,
    clock_timestamp(),
    'ypol',
    clock_timestamp(),
    'initial'
)

//

insert into statuses (
    status_id, 
    status_name,
    is_new,
    is_final,
    record_version,
    creation_date,
    creation_user,
    last_update_date,
    last_update_process
) values (
    3,
    'Cancelled',
    'n',
    'y',
    1,
    clock_timestamp(),
    'ypol',
    clock_timestamp(),
    'initial'
)

//


insert into statuses (
    status_id, 
    status_name,
    is_new,
    is_final,
    record_version,
    creation_date,
    creation_user,
    last_update_date,
    last_update_process
) values (
    4,
    'Closed',
    'n',
    'y',
    1,
    clock_timestamp(),
    'ypol',
    clock_timestamp(),
    'initial'
)