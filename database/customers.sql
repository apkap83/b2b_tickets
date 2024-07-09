create table customers (
    customer_id numeric not null,
    customer_name varchar(250) not null,
    customer_code varchar(10) not null,
    -- audit columns
    record_version numeric not null,
    creation_date timestamp not null,
    creation_user varchar(150) not null,
    last_update_date timestamp,
    last_update_user varchar(150),
    last_update_process varchar(250) not null,
    primary key (customer_id)
)

//

create sequence  customers_sq

//

create unique index customers_uk1 on customers (upper(customer_name))

//

create unique index customers_uk2 on customers (upper(customer_code))

//

insert into customers (
   customer_id ,
   customer_name,
   customer_code,
   record_version,
   creation_date,
   creation_user,
   last_update_process 
) values (
   -1,
   'Nova',
   'Nova',
   1,
   clock_timestamp(),
   'ypol',
   'initial' 
)