-- Example: adding a column to students
-- To add a new column/table, create the next numbered file and restart the backend.

ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
