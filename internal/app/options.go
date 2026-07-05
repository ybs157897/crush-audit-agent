package app

// Option configures [New].
type Option func(*options)

type options struct {
	projectPath  string
	sessionDBDir string
}

// WithProjectPath scopes session list/create operations to a resolved
// workspace path. Empty means no scoping (local CLI per-project DB).
func WithProjectPath(path string) Option {
	return func(o *options) { o.projectPath = path }
}

// WithSessionDBDir sets the data directory used to release the shared
// database pool on shutdown. Defaults to the config data directory.
func WithSessionDBDir(dir string) Option {
	return func(o *options) { o.sessionDBDir = dir }
}

func applyOptions(opts []Option) options {
	var o options
	for _, opt := range opts {
		opt(&o)
	}
	return o
}
