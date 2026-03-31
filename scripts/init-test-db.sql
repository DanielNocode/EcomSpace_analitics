-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE ecomspace_analytics_test OWNER ecomspace'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecomspace_analytics_test')\gexec
