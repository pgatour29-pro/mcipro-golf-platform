-- Check all constraints on event_registrations
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 't' THEN 'TRIGGER'
        WHEN 'x' THEN 'EXCLUSION'
    END AS type_description,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE cls.relname = 'event_registrations'
    AND nsp.nspname = 'public';

-- Check NOT NULL columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'event_registrations'
    AND table_schema = 'public'
    AND is_nullable = 'NO';
