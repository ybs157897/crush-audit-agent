-- +goose Up
-- +goose StatementBegin
ALTER TABLE sessions ADD COLUMN project_path TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_sessions_project_path ON sessions (project_path);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_sessions_project_path;
-- SQLite does not support DROP COLUMN before 3.35; leave column in place on down.
-- +goose StatementEnd
