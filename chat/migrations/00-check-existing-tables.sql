-- Check existing tables in your database
-- Run this first to see what we're working with

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name like '%chat%' or table_name like '%room%' or table_name like '%message%'
order by table_name;
