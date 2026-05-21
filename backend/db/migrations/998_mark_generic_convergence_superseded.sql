INSERT INTO schema_migrations (version, name)
VALUES ('999', 'superseded_operational_postgres_convergence')
ON CONFLICT (version) DO NOTHING;
