package tools

import (
	"cmp"
	"context"
	_ "embed"
	"fmt"
	"strings"

	"charm.land/fantasy"
	"github.com/charmbracelet/crush/internal/filepathext"
	"github.com/charmbracelet/crush/internal/permission"
	"path/filepath"
)

// SecurityScanParams defines the input parameters for the unified security scan tool.
type SecurityScanParams struct {
	Path        string `json:"path,omitempty" description:"Path to scan (file or directory). Defaults to current working directory."`
	Engine      string `json:"engine,omitempty" description:"Scan engine: 'auto' (detect project type), 'semgrep' (source scan), 'spotbugs' (bytecode deep scan), or 'osv' (component CVE query via OSV.dev). Defaults to 'auto'."`
	Config      string `json:"config,omitempty" description:"Semgrep rule config: a registry name (e.g. 'p/security-audit', 'p/owasp-top-ten'), a local YAML file path, or 'auto'. Only used with semgrep engine."`
	Language    string `json:"language,omitempty" description:"Filter by language for Semgrep (e.g. 'go', 'python', 'javascript', 'java')."`
	Severity    string `json:"severity,omitempty" description:"Filter by severity: 'INFO', 'WARNING', or 'ERROR'."`
	Effort      string `json:"effort,omitempty" description:"SpotBugs analysis effort level: 'min', 'default', or 'max'. Higher effort finds more bugs but takes longer."`
	Timeout     int    `json:"timeout,omitempty" description:"Timeout in seconds for the scan. Defaults to 120."`
	MaxFindings int    `json:"max_findings,omitempty" description:"Maximum number of findings to return. Defaults to 50."`
	InstallJava bool   `json:"install_java,omitempty" description:"Automatically install JDK 17 if java is not found. Downloads from Chinese mirrors (Tsinghua/Huawei) for faster speed. Set to true to enable."`
}

const (
	SecurityScanToolName = "security_scan"
	EngineAuto           = "auto"
	EngineSemgrep        = "semgrep"
	EngineSpotBugs       = "spotbugs"
	EngineOSV            = "osv"
)

//go:embed security_scan.md.tpl
var securityScanDescriptionTmpl []byte

func securityScanDescription() string {
	return string(securityScanDescriptionTmpl)
}

// NewSecurityScanTool creates a unified security scan tool that combines Semgrep and SpotBugs engines.
func NewSecurityScanTool(permissions permission.Service, workingDir string) fantasy.AgentTool {
	return fantasy.NewAgentTool(
		SecurityScanToolName,
		securityScanDescription(),
		func(ctx context.Context, params SecurityScanParams, call fantasy.ToolCall) (fantasy.ToolResponse, error) {
			scanPath := cmp.Or(params.Path, workingDir)
			if !filepath.IsAbs(scanPath) {
				scanPath = filepathext.SmartJoin(workingDir, params.Path)
			}

			engine := cmp.Or(params.Engine, EngineAuto)
			timeout := cmp.Or(params.Timeout, DefaultSemgrepTimeout)
			maxFindings := cmp.Or(params.MaxFindings, DefaultMaxFindings)

			// Request permission for the scan.
			sessionID := GetSessionFromContext(ctx)
			if sessionID == "" {
				return fantasy.ToolResponse{}, fmt.Errorf("session ID is required for security scan")
			}

			p, err := permissions.Request(
				ctx,
				permission.CreatePermissionRequest{
					SessionID:   sessionID,
					Path:        scanPath,
					ToolCallID:  call.ID,
					ToolName:    SecurityScanToolName,
					Action:      "scan",
					Description: fmt.Sprintf("Run security scan on %s using engine: %s", scanPath, engine),
					Params:      params,
				},
			)
			if err != nil {
				return fantasy.ToolResponse{}, err
			}
			if !p {
				return NewPermissionDeniedResponse(), nil
			}

			// Ensure Java is available for SpotBugs engine.
			needsJava := engine == EngineSpotBugs || engine == EngineAuto
			if needsJava && !isJavaAvailable(workingDir) {
				if !params.InstallJava {
					return fantasy.NewTextResponse(
						"Java (JDK 17) is required for SpotBugs deep scanning but was not found.\n\n" +
							"Please call this tool again with `install_java: true` to automatically download and install JDK 17.\n" +
							"The JDK will be installed to tools/jdk17/ in the project directory.\n\n" +
							"Alternatively, install JDK 17 manually:\n" +
							"- Windows: Download from https://adoptium.net/ or use `winget install EclipseAdoptium.Temurin.17.JDK`\n" +
							"- Linux: `sudo apt install openjdk-17-jdk` or `sudo yum install java-17-openjdk`",
					), nil
				}

				// Install JDK 17.
				javaPath, err := installJDK17(ctx, workingDir)
				if err != nil {
					return fantasy.NewTextErrorResponse(
						fmt.Sprintf("Failed to install JDK 17: %v\nPlease install JDK 17 manually and retry.", err),
					), nil
				}
				_ = javaPath // javaPath is now available via findJavaPath(workingDir)
			}

			// Route to the appropriate engine(s).
			switch engine {
			case EngineSemgrep:
				return runSemgrepEngine(ctx, params, workingDir, scanPath, maxFindings)
			case EngineSpotBugs:
				return runSpotBugsEngine(ctx, params, workingDir, scanPath, maxFindings)
			case EngineOSV:
				return runOSVEngine(ctx, workingDir, maxFindings)
			case EngineAuto:
				return runAutoScan(ctx, params, workingDir, scanPath, timeout, maxFindings)
			default:
				return fantasy.NewTextErrorResponse(
					fmt.Sprintf("unknown engine: %s (supported: auto, semgrep, spotbugs, osv)", engine),
				), nil
			}
		},
	)
}

// runSemgrepEngine runs only the Semgrep engine and formats results.
func runSemgrepEngine(ctx context.Context, params SecurityScanParams, workingDir, scanPath string, maxFindings int) (fantasy.ToolResponse, error) {
	semgrepParams := SemgrepParams{
		Path:     params.Path,
		Config:   params.Config,
		Language: params.Language,
		Severity: params.Severity,
		Timeout:  params.Timeout,
	}

	output, err := runSemgrepScan(ctx, semgrepParams, workingDir)
	if err != nil {
		return fantasy.NewTextErrorResponse(err.Error()), nil
	}

	return formatSemgrepResults(*output, maxFindings, scanPath), nil
}

// runSpotBugsEngine runs only the SpotBugs engine and formats results.
func runSpotBugsEngine(ctx context.Context, params SecurityScanParams, workingDir, scanPath string, maxFindings int) (fantasy.ToolResponse, error) {
	// Check SpotBugs availability.
	spotBugsDir := findSpotBugsDir(workingDir)
	if !isSpotBugsAvailable(spotBugsDir) {
		return fantasy.NewTextErrorResponse(
			fmt.Sprintf("SpotBugs not found. Expected bundled tools at tools/spotbugs/ (relative to project) or cache at %s", spotBugsCacheDir()),
		), nil
	}

	// Detect build system and find compiled classes.
	buildSys := detectJavaBuildSystem(workingDir)
	classPath := findCompiledClasses(workingDir, buildSys)

	if classPath == "" {
		if buildSys == buildSystemNone {
			return fantasy.NewTextErrorResponse(
				"No Java build system detected (pom.xml or build.gradle required). Use engine='semgrep' for source-only scanning.",
			), nil
		}
		// Try to compile.
		if err := compileJavaProject(ctx, workingDir, buildSys); err != nil {
			return fantasy.NewTextErrorResponse(
				fmt.Sprintf("Failed to compile Java project: %v. Use engine='semgrep' for source-only scanning.", err),
			), nil
		}
		classPath = findCompiledClasses(workingDir, buildSys)
		if classPath == "" {
			return fantasy.NewTextErrorResponse(
				"Compilation succeeded but no class files found. Use engine='semgrep' for source-only scanning.",
			), nil
		}
	}

	output, err := runSpotBugsScan(ctx, workingDir, classPath, scanPath, params.Effort)
	if err != nil {
		return fantasy.NewTextErrorResponse(err.Error()), nil
	}

	return formatSpotBugsResults(output, maxFindings, scanPath), nil
}

// runOSVEngine runs the OSV.dev component vulnerability scan.
func runOSVEngine(ctx context.Context, workingDir string, maxFindings int) (fantasy.ToolResponse, error) {
	output, err := runOSVScan(ctx, workingDir)
	if err != nil {
		return fantasy.NewTextErrorResponse(fmt.Sprintf("OSV.dev scan failed: %v", err)), nil
	}
	return fantasy.NewTextResponse(formatOSVResults(output, maxFindings)), nil
}

// runAutoScan automatically selects engines based on project type.
func runAutoScan(ctx context.Context, params SecurityScanParams, workingDir, scanPath string, timeout, maxFindings int) (fantasy.ToolResponse, error) {
	// Check if this is a Java project.
	buildSys := detectJavaBuildSystem(workingDir)
	isJava := buildSys != buildSystemNone || hasJavaFiles(scanPath)

	if !isJava {
		// Non-Java project: Semgrep only.
		return runSemgrepEngine(ctx, params, workingDir, scanPath, maxFindings)
	}

	// Java project: try all engines.
	var sb strings.Builder
	totalFindings := 0
	enginesUsed := []string{}

	// 1. Semgrep source scan (always run for Java).
	semgrepParams := SemgrepParams{
		Path:     params.Path,
		Config:   params.Config,
		Language: cmp.Or(params.Language, "java"),
		Severity: params.Severity,
		Timeout:  timeout,
	}

	semgrepOutput, semgrepErr := runSemgrepScan(ctx, semgrepParams, workingDir)
	if semgrepErr == nil && semgrepOutput != nil {
		enginesUsed = append(enginesUsed, "Semgrep (source)")
		totalFindings += len(semgrepOutput.Results)
		sb.WriteString(formatSemgrepText(semgrepOutput, scanPath))
		sb.WriteString("\n\n")
	}

	// 2. SpotBugs bytecode scan (try if build system available).
	var spotBugsOutput *SpotBugsOutput
	classPath := findCompiledClasses(workingDir, buildSys)

	if classPath == "" && buildSys != buildSystemNone {
		// Try to compile first.
		if err := compileJavaProject(ctx, workingDir, buildSys); err == nil {
			classPath = findCompiledClasses(workingDir, buildSys)
		}
	}

	if classPath != "" {
		// Run SpotBugs if available.
		if isSpotBugsAvailable(findSpotBugsDir(workingDir)) {
			var scanErr error
			spotBugsOutput, scanErr = runSpotBugsScan(ctx, workingDir, classPath, scanPath, params.Effort)
			if scanErr == nil && spotBugsOutput != nil {
				enginesUsed = append(enginesUsed, "SpotBugs+FindSecBugs (bytecode)")
				totalFindings += len(spotBugsOutput.Findings)
				sb.WriteString(formatSpotBugsText(spotBugsOutput, scanPath))
				sb.WriteString("\n\n")
			}
		}
	}

	// 3. OSV.dev component vulnerability scan.
	osvOutput, osvErr := runOSVScan(ctx, workingDir)
	if osvErr == nil && osvOutput != nil && osvOutput.TotalCVEs > 0 {
		enginesUsed = append(enginesUsed, "OSV.dev (component CVE)")
		totalFindings += osvOutput.TotalCVEs
		sb.WriteString(formatOSVResults(osvOutput, maxFindings))
		sb.WriteString("\n\n")
	}

	// If all engines failed, return error.
	if len(enginesUsed) == 0 {
		errMsg := "Security scan failed:\n"
		if semgrepErr != nil {
			errMsg += fmt.Sprintf("- Semgrep: %v\n", semgrepErr)
		}
		errMsg += "- SpotBugs: no compiled classes found (compilation may have failed)\n"
		if osvErr != nil {
			errMsg += fmt.Sprintf("- OSV.dev: %v\n", osvErr)
		}
		return fantasy.NewTextErrorResponse(errMsg), nil
	}

	// Build header.
	header := fmt.Sprintf("# Security Scan Results\n\n**Engines used:** %s\n**Total findings:** %d\n\n",
		strings.Join(enginesUsed, ", "), totalFindings)

	result := header + sb.String()
	if totalFindings == 0 {
		result = header + "No security issues found by any engine.\n"
	}

	return fantasy.NewTextResponse(result), nil
}

// formatSemgrepText formats Semgrep output as plain text (without fantasy wrapper).
func formatSemgrepText(output *SemgrepOutput, scanPath string) string {
	if len(output.Results) == 0 {
		return fmt.Sprintf("## Semgrep Results\nNo findings detected in %s.", scanPath)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## Semgrep Results (%d finding(s))\n\n", len(output.Results)))

	// Count by severity.
	severityCounts := map[string]int{}
	for _, f := range output.Results {
		sev := strings.ToUpper(f.Extra.Severity)
		severityCounts[sev]++
	}

	for _, sev := range []string{"ERROR", "WARNING", "INFO"} {
		if count, ok := severityCounts[sev]; ok {
			sb.WriteString(fmt.Sprintf("- %s: %d\n", sev, count))
		}
	}
	sb.WriteString("\n")

	// Group by file.
	fileFindings := map[string][]SemgrepFinding{}
	for _, f := range output.Results {
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
			if len(f.Extra.Metadata.CWE) > 0 {
				sb.WriteString(fmt.Sprintf("CWE: %s\n", strings.Join(f.Extra.Metadata.CWE, ", ")))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// formatSpotBugsText formats SpotBugs output as plain text.
func formatSpotBugsText(output *SpotBugsOutput, scanPath string) string {
	if len(output.Findings) == 0 {
		return fmt.Sprintf("## SpotBugs Results\nNo findings detected in %s.", scanPath)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## SpotBugs+FindSecBugs Results (%d finding(s))\n\n", len(output.Findings)))

	// Count by priority.
	priorityCounts := map[string]int{}
	for _, f := range output.Findings {
		priorityCounts[f.Priority]++
	}
	for _, pri := range []string{"High", "Normal", "Low"} {
		if count, ok := priorityCounts[pri]; ok {
			sb.WriteString(fmt.Sprintf("- %s: %d\n", pri, count))
		}
	}
	sb.WriteString("\n")

	// Group by class.
	classFindings := map[string][]SpotBugsFinding{}
	for _, f := range output.Findings {
		classFindings[f.ClassName] = append(classFindings[f.ClassName], f)
	}

	for className, classfs := range classFindings {
		sb.WriteString(fmt.Sprintf("### %s\n", className))
		for _, f := range classfs {
			sev := spotBugsPriorityToSeverity(f.Priority)
			icon := severityIcon(sev)
			lineStr := "N/A"
			if f.LineNumber > 0 {
				lineStr = fmt.Sprintf("%d", f.LineNumber)
			}
			sb.WriteString(fmt.Sprintf("%s **[%s]** Line %s: %s\n",
				icon, f.Priority, lineStr, f.Message))
			sb.WriteString(fmt.Sprintf("Rule: `%s` (Category: %s)\n", f.Type, f.Category))
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// formatSpotBugsResults formats SpotBugs output into a fantasy ToolResponse.
func formatSpotBugsResults(output *SpotBugsOutput, maxFindings int, scanPath string) fantasy.ToolResponse {
	if len(output.Findings) == 0 {
		return fantasy.NewTextResponse(fmt.Sprintf("No findings detected in %s by SpotBugs.", scanPath))
	}

	findings := output.Findings
	totalCount := len(findings)
	truncated := false
	if len(findings) > maxFindings {
		findings = findings[:maxFindings]
		truncated = true
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("SpotBugs scan found %d finding(s)", totalCount))
	if truncated {
		sb.WriteString(fmt.Sprintf(" (showing %d)", maxFindings))
	}
	sb.WriteString(":\n\n")

	// Priority summary.
	priorityCounts := map[string]int{}
	for _, f := range findings {
		priorityCounts[f.Priority]++
	}
	sb.WriteString("**Summary:**\n")
	for _, pri := range []string{"High", "Normal", "Low"} {
		if count, ok := priorityCounts[pri]; ok {
			sb.WriteString(fmt.Sprintf("- %s: %d\n", pri, count))
		}
	}
	sb.WriteString("\n**Findings:**\n\n")

	for _, f := range findings {
		sev := spotBugsPriorityToSeverity(f.Priority)
		icon := severityIcon(sev)
		lineStr := "N/A"
		if f.LineNumber > 0 {
			lineStr = fmt.Sprintf("%d", f.LineNumber)
		}
		sb.WriteString(fmt.Sprintf("%s **[%s]** %s Line %s: %s\n",
			icon, f.Priority, f.ClassName, lineStr, f.Message))
		sb.WriteString(fmt.Sprintf("Rule: `%s` (Category: %s)\n\n", f.Type, f.Category))
	}

	if truncated {
		sb.WriteString(fmt.Sprintf("\n... and %d more finding(s). Use max_findings parameter to see more.\n", totalCount-maxFindings))
	}

	return fantasy.NewTextResponse(sb.String())
}
