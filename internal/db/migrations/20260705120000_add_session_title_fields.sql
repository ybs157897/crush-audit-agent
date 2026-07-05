-- +goose Up
-- +goose StatementBegin
ALTER TABLE sessions ADD COLUMN title_source TEXT NOT NULL DEFAULT 'default'
    CHECK (title_source IN ('default', 'first_input', 'generated', 'custom'));

ALTER TABLE sessions ADD COLUMN title_overridden INTEGER NOT NULL DEFAULT 0
    CHECK (title_overridden IN (0, 1));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- SQLite does not support DROP COLUMN before 3.35; columns remain on down.
-- +goose StatementEnd
