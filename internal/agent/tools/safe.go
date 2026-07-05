package tools

import (
	"runtime"
	"slices"
	"strings"
)

var safeCommands = []string{
	// Bash builtins and core utils
	"cal",
	"date",
	"df",
	"du",
	"echo",
	"env",
	"free",
	"groups",
	"hostname",
	"id",
	"kill",
	"killall",
	"ls",
	"nice",
	"nohup",
	"printenv",
	"ps",
	"pwd",
	"set",
	"time",
	"timeout",
	"top",
	"type",
	"uname",
	"unset",
	"uptime",
	"whatis",
	"whereis",
	"which",
	"whoami",

	// Git
	"git blame",
	"git branch",
	"git config --get",
	"git config --list",
	"git describe",
	"git diff",
	"git grep",
	"git log",
	"git ls-files",
	"git ls-remote",
	"git remote",
	"git rev-parse",
	"git shortlog",
	"git show",
	"git status",
	"git tag",

	// Static analysis and code audit tools
	"go vet",
	"go build",
	"go test",
	"go mod",
	"go list",
	"go doc",
	"staticcheck",
	"govulncheck",
	"gosec",
	"golangci-lint",
	"golint",
	"errcheck",
	"ineffassign",
	"unconvert",
	"semgrep",
	"bandit",
	"pylint",
	"flake8",
	"mypy",
	"eslint",
	"trivy",
	"grype",
	"syft",
	"snyk",
	"npm audit",
	"yarn audit",
	"pip-audit",
	"cargo audit",
	"cargo deny",
	"spotbugs",
	"findsecbugs",
	"mvn",
	"gradle",
	"find",
	"xargs",
	"wc",
	"sort",
	"uniq",
	"head",
	"tail",
	"cat",
	"less",
	"file",
	"strings",
	"hexdump",
	"md5sum",
	"sha256sum",
	"sha1sum",
	"diff",
	"cmp",
}

var chainingMetacharacters = []string{
	";",
	"|",
	"&&",
	"$(",
	"`",
}

// containsCommandChaining reports whether s contains shell metacharacters
// that enable command chaining or substitution.
func containsCommandChaining(s string) bool {
	return slices.ContainsFunc(chainingMetacharacters, func(c string) bool {
		return strings.Contains(s, c)
	})
}

func init() {
	if runtime.GOOS == "windows" {
		safeCommands = append(
			safeCommands,
			// Windows-specific commands
			"ipconfig",
			"nslookup",
			"ping",
			"systeminfo",
			"tasklist",
			"where",
		)
	}
}
