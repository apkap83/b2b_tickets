create table ticket_categories (
    category_id numeric not null,
    customer_id numeric not null,
    category_name varchar(100) not null,
    
    -- audit columns
    record_version numeric not null,
    creation_date timestamp not null,
    creation_user varchar(150) not null,
    last_update_date timestamp,
    last_update_user varchar(150),
    last_update_process varchar(250) not null,
    primary key (category_id)
)

//

create sequence categories_sq

//

create unique index cat_uk1  on ticket_categories (customer_id, upper(category_name))

//

alter table ticket_categories
add constraint cat_cust_fk
foreign key (customer_id)
references customers (customer_id)

//

create index cat_cust_fki on ticket_categories (customer_id)

//
insert into ticket_categories (
   category_id,
   customer_id,
   category_name,
   record_version,
   creation_date,
   creation_user,
   last_update_date,
   last_update_process 
) values (
   nextval('categories_sq'),
   -1,
   'Test category',
   1,
   clock_timestamp() ,
   'ypol',
   clock_timestamp(),
   'initial' 
