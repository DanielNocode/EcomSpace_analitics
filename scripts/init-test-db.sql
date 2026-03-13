-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE webinar_pulse_test OWNER pulse'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'webinar_pulse_test')\gexec
