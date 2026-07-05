package tools

import (
	"bytes"
	"cmp"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"html/template"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"charm.land/fantasy"
	"github.com/charmbracelet/crush/internal/filepathext"
	"github.com/charmbracelet/crush/internal/permission"
)

// SemgrepParams defines the input parameters for the semgrep tool.
type SemgrepParams struct {
	Path     string `json:"path,omitempty" description:"Path to scan (file or directory). Defaults to current working directory."`
	Config   string `json:"config,omitempty" description:"Semgrep rule config: a registry name (e.g. 'p/security-audit', 'p/owasp-top-ten'), a local YAML file path, or 'auto' for automatic rule selection. Defaults to 'auto'."`
	Language string `json:"language,omitempty" description:"Filter by language (e.g. 'go', 'python', 'javascript', 'typescript', 'java')."`
	Severity string `json:"severity,omitempty" description:"Filter by severity: 'INFO', 'WARNING', or 'ERROR'."`
	Timeout  int    `json:"timeout,omitempty" description:"Timeout in seconds for the scan. Defaults to 120."`
	MaxFindings int `json:"max_findings,omitempty" description:"Maximum number of findings to return. Defaults to 50."`
}

// SemgrepFinding represents a single finding from semgrep.
type SemgrepFinding struct {
	CheckID    string `json:"check_id"`
	Path       string `json:"path"`
	StartLine  int    `json:"start_line"`
	EndLine    int    `json:"end_line"`
	Extra      SemgrepExtra `json:"extra"`
}

// SemgrepExtra contains the extra details of a finding.
type SemgrepExtra struct {
	Message  string `json:"message"`
	Severity string `json:"severity"`
	Metadata SemgrepMetadata `json:"metadata"`
	Lines    string `json:"lines"`
}

// SemgrepMetadata contains metadata about the rule.
type SemgrepMetadata struct {
	CWE        []string `json:"cwe"`
	OWASP      []string `json:"owasp"`
	References []string `json:"references"`
	Category   string   `json:"category"`
}

// SemgrepOutput represents the JSON output from semgrep.
type SemgrepOutput struct {
	Results []SemgrepFinding `json:"results"`
	Errors  []any            `json:"errors"`
}

const (
	SemgrepToolName     = "semgrep"
	DefaultSemgrepTimeout = 120
	DefaultMaxFindings  = 50
)

//go:embed semgrep.md.tpl
var semgrepDescriptionTmpl []byte

var semgrepDescriptionTpl = template.Must(
	template.New("semgrepDescription").
		Parse(string(semgrepDescriptionTmpl)),
)

func semgrepDescription() string {
	return string(semgrepDescriptionTmpl)
}

// NewSemgrepTool creates a new semgrep tool for static analysis scanning.
func NewSemgrepTool(permissions permission.Service, workingDir string) fantasy.AgentTool {
	return fantasy.NewAgentTool(
		SemgrepToolName,
		semgrepDescription(),
		func(ctx context.Context, params SemgrepParams, call fantasy.ToolCall) (fantasy.ToolResponse, error) {
			// Check if semgrep is available.
			semgrepPath, err := exec.LookPath("semgrep")
			if err != nil {
				return fantasy.NewTextErrorResponse(
					"semgrep is not installed. Install it with: pip install semgrep (or: brew install semgrep on macOS)",
				), nil
			}

			scanPath := cmp.Or(params.Path, workingDir)
			if !filepath.IsAbs(scanPath) {
				scanPath = filepathext.SmartJoin(workingDir, params.Path)
			}

			config := cmp.Or(params.Config, "auto")
			timeout := cmp.Or(params.Timeout, DefaultSemgrepTimeout)
			maxFindings := cmp.Or(params.MaxFindings, DefaultMaxFindings)

			// Request permission for the scan.
			sessionID := GetSessionFromContext(ctx)
			if sessionID == "" {
				return fantasy.ToolResponse{}, fmt.Errorf("session ID is required for semgrep scan")
			}

			p, err := permissions.Request(
				ctx,
				permission.CreatePermissionRequest{
					SessionID:   sessionID,
					Path:        scanPath,
					ToolCallID:  call.ID,
					ToolName:    SemgrepToolName,
					Action:      "scan",
					Description: fmt.Sprintf("Run semgrep scan on %s with config %s", scanPath, config),
					Params:      params,
				},
			)
			if err != nil {
				return fantasy.ToolResponse{}, err
			}
			if !p {
				return NewPermissionDeniedResponse(), nil
			}

			// Build semgrep command arguments.
			args := []string{
				"scan",
				"--json",
				"--config", config,
				"--timeout", fmt.Sprintf("%d", timeout),
				"--max-target-bytes", "1000000",
			}

			if params.Language != "" {
				args = append(args, "--language", params.Language)
			}

			if params.Severity != "" {
				args = append(args, "--severity", params.Severity)
			}

			args = append(args, scanPath)

			// Run semgrep with timeout.
			scanCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout+30)*time.Second)
			defer cancel()

			cmd := exec.CommandContext(scanCtx, semgrepPath, args...)
			cmd.Dir = workingDir

			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr

			// semgrep returns exit code 1 when findings are found, which is normal.
			runErr := cmd.Run()
			if runErr != nil {
				if exitErr, ok := runErr.(*exec.ExitError); ok {
					// Exit code 1 means findings were found - this is normal.
					if exitErr.ExitCode() != 1 {
						errMsg := stderr.String()
						if errMsg == "" {
							errMsg = runErr.Error()
						}
						return fantasy.NewTextErrorResponse(
							fmt.Sprintf("semgrep scan failed (exit code %d): %s", exitErr.ExitCode(), errMsg),
						), nil
					}
				} else {
					return fantasy.ToolResponse{}, fmt.Errorf("failed to run semgrep: %w", runErr)
				}
			}

			// Parse JSON output.
			var output SemgrepOutput
			if err := json.Unmarshal(stdout.Bytes(), &output); err != nil {
				return fantasy.NewTextErrorResponse(
					fmt.Sprintf("failed to parse semgrep output: %v\nRaw output: %s", err, truncateSemgrepOutput(stdout.String())),
				), nil
			}

			// Format results.
			return formatSemgrepResults(output, maxFindings, scanPath), nil
		},
	)
}

// formatSemgrepResults formats semgrep output into a human-readable response.
func formatSemgrepResults(output SemgrepOutput, maxFindings int, scanPath string) fantasy.ToolResponse {
	findings := output.Results
	if len(findings) == 0 {
		return fantasy.NewTextResponse(fmt.Sprintf("No findings detected in %s.", scanPath))
	}

	totalCount := len(findings)
	truncated := false
	if len(findings) > maxFindings {
		findings = findings[:maxFindings]
		truncated = true
	}

	// Count by severity.
	severityCounts := map[string]int{}
	for _, f := range findings {
		sev := strings.ToUpper(f.Extra.Severity)
		severityCounts[sev]++
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Semgrep scan found %d finding(s)", totalCount))
	if truncated {
		sb.WriteString(fmt.Sprintf(" (showing %d)", maxFindings))
	}
	sb.WriteString(":\n\n")

	// Severity summary.
	sb.WriteString("**Summary:**\n")
	for _, sev := range []string{"ERROR", "WARNING", "INFO"} {
		if count, ok := severityCounts[sev]; ok {
			sb.WriteString(fmt.Sprintf("- %s: %d\n", sev, count))
		}
	}
	sb.WriteString("\n**Findings:**\n\n")

	// Group findings by file.
	fileFindings := map[string][]SemgrepFinding{}
	for _, f := range findings {
		fileFindings[f.Path] = append(fileFindings[f.Path], f)
	}

	for filePath, filefs := range fileFindings {
		sb.WriteString(fmt.Sprintf("### %s\n", filePath))
		for _, f := range filefs {
			severity := strings.ToUpper(f.Extra.Severity)
			icon := severityIcon(severity)
			sb.WriteString(fmt.Sprintf("%s **[%s]** Line %d: %s\n",
				icon, severity, f.StartLine, f.Extra.Message))
			if f.Extra.Lines != "" {
				sb.WriteString(fmt.Sprintf("```\n%s\n```\n", strings.TrimSpace(f.Extra.Lines)))
			}
			sb.WriteString(fmt.Sprintf("Rule: `%s`\n", f.CheckID))

			// Add CWE/OWASP references if available.
			if len(f.Extra.Metadata.CWE) > 0 {
				sb.WriteString(fmt.Sprintf("CWE: %s\n", strings.Join(f.Extra.Metadata.CWE, ", ")))
			}
			if len(f.Extra.Metadata.OWASP) > 0 {
				sb.WriteString(fmt.Sprintf("OWASP: %s\n", strings.Join(f.Extra.Metadata.OWASP, ", ")))
			}
			sb.WriteString("\n")
		}
	}

	if truncated {
		sb.WriteString(fmt.Sprintf("\n... and %d more finding(s). Use max_findings parameter to see more.\n", totalCount-maxFindings))
	}

	return fantasy.WithResponseMetadata(
		fantasy.NewTextResponse(sb.String()),
		SemgrepResponseMetadata{
			TotalFindings: totalCount,
			ShownFindings: len(findings),
			Truncated:     truncated,
			ScanPath:      scanPath,
		},
	)
}

// SemgrepResponseMetadata contains metadata about the semgrep scan results.
type SemgrepResponseMetadata struct {
	TotalFindings int    `json:"total_findings"`
	ShownFindings int    `json:"shown_findings"`
	Truncated     bool   `json:"truncated"`
	ScanPath      string `json:"scan_path"`
}

func severityIcon(severity string) string {
	switch strings.ToUpper(severity) {
	case "ERROR":
		return "🔴"
	case "WARNING":
		return "🟡"
	case "INFO":
		return "🔵"
	default:
		return "⚪"
	}
}

func truncateSemgrepOutput(s string) string {
	if len(s) > 2000 {
		return s[:2000] + "... (truncated)"
	}
	return s
}
