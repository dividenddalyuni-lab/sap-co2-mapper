-- Berechtigungen für anon und authenticated Rollen
GRANT ALL ON companies TO anon, authenticated;
GRANT ALL ON uploads TO anon, authenticated;
GRANT ALL ON booking_lines TO anon, authenticated;
GRANT ALL ON calculated_lines TO anon, authenticated;
GRANT ALL ON supplier_sessions TO anon, authenticated;

-- Sequences für BIGSERIAL Felder
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
