-- Seed data for IDMC Profiling Extractor
-- Sample data for testing

-- Create default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (username, email, hashed_password, full_name, is_admin)
VALUES ('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lZjNr6VzZ7nS', 'System Administrator', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Create test user
-- Password: user123
INSERT INTO users (username, email, hashed_password, full_name, is_admin)
VALUES ('testuser', 'testuser@example.com', '$2b$12$XJGnN8FqUPzVw0YGEZnMr.vYoqJ4S7YqUjKxKcRZTxW7zQnN4FVCK', 'Test User', FALSE)
ON CONFLICT (username) DO NOTHING;

-- Sample time dimension data (populate for current year and previous year)
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year');
    end_date DATE := DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year';
    current_date_iter DATE;
BEGIN
    current_date_iter := start_date;
    WHILE current_date_iter <= end_date LOOP
        INSERT INTO dim_time (date, year, month, day, week, quarter, day_of_week, day_name, month_name, is_weekend)
        VALUES (
            current_date_iter::TIMESTAMP,
            EXTRACT(YEAR FROM current_date_iter)::INTEGER,
            EXTRACT(MONTH FROM current_date_iter)::INTEGER,
            EXTRACT(DAY FROM current_date_iter)::INTEGER,
            EXTRACT(WEEK FROM current_date_iter)::INTEGER,
            EXTRACT(QUARTER FROM current_date_iter)::INTEGER,
            EXTRACT(DOW FROM current_date_iter)::INTEGER,
            TO_CHAR(current_date_iter, 'Day'),
            TO_CHAR(current_date_iter, 'Month'),
            CASE WHEN EXTRACT(DOW FROM current_date_iter) IN (0, 6) THEN 1 ELSE 0 END
        )
        ON CONFLICT (date) DO NOTHING;

        current_date_iter := current_date_iter + INTERVAL '1 day';
    END LOOP;
END $$;

-- Note: When using mock API, connection will be created via API
-- When using real IDMC, user must create connection via UI
