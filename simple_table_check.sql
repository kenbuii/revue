-- SIMPLE TABLE EXISTENCE CHECK
-- Run this to see what tables exist
 
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name; 