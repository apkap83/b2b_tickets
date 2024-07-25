create table service_types (
   service_id numeric not null,
   service_name varchar(100) not null,
   start_date timestamp not null,
   end_date timestamp,
   -- audit columns
   record_version numeric not null,
   creation_date timestamp not null,
   creation_user varchar(150) not null,
   last_update_date timestamp,
   last_update_user varchar(150),
   last_update_process varchar(250) not null,
   primary key (service_id)
)

//

create sequence services_sq

//

create unique index srt_uk1 on service_types (upper(service_name))

//

insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), '24NMC', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), '4G Backup', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), '4G Backup Activation', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'All Services', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'ALU', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Asymmetric MPLS Activation', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Cloud Infrastructure', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'CORPORATE CONNECT', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'CORPORATE NETWORK', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'DSL', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'DTH', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'DTH - UP Link', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'DTH-EON', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'EDIL', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'EON', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'EQUIPMENT', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'ERGATIKAT', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'FIXED', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'GPRS', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'HOSTING SERVICES', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'INTERNET', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'IPTV', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'IT SYSTEMS INFRASTRUCTURE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'LEASED LINE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'MOBILE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'MOBILE & FIXED', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'MPLS Asymmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'MPLS VPN', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'NETWORK PROCESS', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'NEUROSOFT', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'OUTAGE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'PRI',  '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'SERVICE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'SIP', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'TBSP', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'TDM', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Info Asymmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Info Symmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Information Asymmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Information Symmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Modifications Asymmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Modifications Symmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Mods Asymmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'Technical Mods Symmetric', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'VAS', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'VAS SERVICES', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'VOICE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'VPN', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//
insert into service_types (service_id, service_name ,start_date, record_version, creation_date, creation_user, last_update_process) values (nextval('services_sq'), 'WHOLESALE', '1970/01/01', 1, clock_timestamp(), 'ypol', 'initial')//