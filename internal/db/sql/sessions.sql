-- name: CreateSession :one
INSERT INTO sessions (
    id,
    parent_session_id,
    title,
    message_count,
    prompt_tokens,
    completion_tokens,
    cost,
    summary_message_id,
    project_path,
    title_source,
    title_overridden,
    updated_at,
    created_at
) VALUES (
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    null,
    ?,
    ?,
    ?,
    strftime('%s', 'now'),
    strftime('%s', 'now')
) RETURNING *;

-- name: GetSessionByID :one
SELECT *
FROM sessions
WHERE id = ? LIMIT 1;

-- name: GetLastSession :one
SELECT *
FROM sessions
WHERE parent_session_id IS NULL
  AND (? = '' OR project_path = ?)
ORDER BY updated_at DESC
LIMIT 1;

-- name: ListSessions :many
SELECT *
FROM sessions
WHERE parent_session_id IS NULL
  AND (? = '' OR project_path = ?)
ORDER BY updated_at DESC;

-- name: CountSessionsByProjectPath :one
SELECT COUNT(*) AS count
FROM sessions
WHERE parent_session_id IS NULL
  AND project_path = ?;

-- name: UpdateSession :one
UPDATE sessions
SET
    title = ?,
    prompt_tokens = ?,
    completion_tokens = ?,
    summary_message_id = ?,
    cost = ?,
    todos = ?,
    title_source = ?,
    title_overridden = ?
WHERE id = ?
RETURNING *;

-- name: UpdateSessionTitleAndUsage :exec
UPDATE sessions
SET
    title = ?,
    title_source = ?,
    prompt_tokens = prompt_tokens + ?,
    completion_tokens = completion_tokens + ?,
    cost = cost + ?,
    updated_at = strftime('%s', 'now')
WHERE id = ?;

-- name: RenameSession :exec
UPDATE sessions
SET
    title = ?,
    title_source = 'custom',
    title_overridden = 1
WHERE id = ?;

-- name: UpdateSessionTitleMeta :exec
UPDATE sessions
SET
    title = ?,
    title_source = ?,
    updated_at = strftime('%s', 'now')
WHERE id = ?
  AND title_overridden = 0;

-- name: UpdateSessionSearchableText :exec
UPDATE sessions
SET searchable_text = ?
WHERE id = ?;

-- name: ListSessionsNeedingSearchableText :many
SELECT id, parent_session_id, title, message_count, prompt_tokens, completion_tokens, cost, updated_at, created_at, summary_message_id, todos, project_path, title_source, title_overridden, searchable_text
FROM sessions
WHERE parent_session_id IS NULL
  AND (? = '' OR project_path = ?)
  AND searchable_text = ''
  AND message_count > 0
ORDER BY updated_at DESC
LIMIT ?;

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE id = ?;
