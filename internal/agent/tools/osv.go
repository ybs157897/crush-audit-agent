package tools

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// OSVQueryResult represents a single vulnerability from OSV.dev.
type OSVQueryResult struct {
	Vulns []OSVVulnerability `json:"vulns"`
}

// OSVVulnerability represents a single CVE entry.
type OSVVulnerability struct {
	ID       string `json:"id"`
	Summary  string `json:"summary"`
	Severity []struct {
		Type  string `json:"type"`
		Score string `json:"score"`
	} `json:"severity"`
	Aliases    []string `json:"aliases"`
	Modified   string   `json:"modified"`
	Affected   []struct {
		Package struct {
			Ecosystem string `json:"ecosystem"`
			Name      string `json:"name"`
		} `json:"package"`
		Ranges []struct {
			Type   string `json:"type"`
			Events []struct {
				Introduced string `json:"introduced,omitempty"`
				Fixed      string `json:"fixed,omitempty"`
			} `json:"events"`
		} `json:"ranges"`
		DatabaseSpecific struct {
			Severity string `json:"severity"`
			CWEIds   []string `json:"cwe_ids"`
		} `json:"database_specific"`
	} `json:"affected"`
	References []struct {
		Type string `json:"type"`
		URL  string `json:"url"`
	} `json:"references"`
}

// JavaDependency represents a parsed Java dependency.
type JavaDependency struct {
	GroupID    string
	ArtifactID string
	Version    string
	Scope      string
	Source     string // "pom.xml" or "build.gradle"
}

// OSVFinding represents a single CVE finding for a dependency.
type OSVFinding struct {
	CVEID      string
	Package    string
	Version    string
	Severity   string
	Summary    string
	Aliases    []string
	CWEIds     []string
	FixedIn    string
	Affected   JavaDependency
}

// OSVOutput represents the result of an OSV.dev scan.
type OSVOutput struct {
	Findings    []OSVFinding
	TotalDeps   int
	VulnDeps    int
	TotalCVEs   int
	Errors      []string
}

const osvAPIURL = "https://api.osv.dev/v1/query"

// queryOSV queries the OSV.dev API for a single package version.
func queryOSV(ctx context.Context, groupID, artifactID, version string) (*OSVQueryResult, error) {
	// OSV.dev uses "groupId:artifactId" as the package name for Maven.
	pkgName := artifactID
	if groupID != "" {
		pkgName = groupID + ":" + artifactID
	}

	reqBody := map[string]any{
		"package": map[string]string{
			"name":      pkgName,
			"ecosystem": "Maven",
		},
		"version": version,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	queryCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(queryCtx, http.MethodPost, osvAPIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OSV API query failed for %s:%s@%s: %w", groupID, artifactID, version, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OSV API returned %d for %s@%s: %s", resp.StatusCode, pkgName, version, string(body))
	}

	var result OSVQueryResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode OSV response: %w", err)
	}

	return &result, nil
}

// parsePomXML extracts dependencies from a Maven pom.xml file.
func parsePomXML(path string) ([]JavaDependency, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var pom struct {
		Dependencies struct {
			Dependency []struct {
				GroupID    string `xml:"groupId"`
				ArtifactID string `xml:"artifactId"`
				Version    string `xml:"version"`
				Scope      string `xml:"scope"`
			} `xml:"dependency"`
		} `xml:"dependencies"`
		// Handle parent POM with dependencyManagement.
		DependencyManagement struct {
			Dependencies struct {
				Dependency []struct {
					GroupID    string `xml:"groupId"`
					ArtifactID string `xml:"artifactId"`
					Version    string `xml:"version"`
					Scope      string `xml:"scope"`
				} `xml:"dependency"`
			} `xml:"dependencies"`
		} `xml:"dependencyManagement"`
	}

	if err := xml.Unmarshal(data, &pom); err != nil {
		return nil, fmt.Errorf("parse pom.xml: %w", err)
	}

	var deps []JavaDependency
	seen := make(map[string]bool)

	addDeps := func(xmlDeps []struct {
		GroupID    string `xml:"groupId"`
		ArtifactID string `xml:"artifactId"`
		Version    string `xml:"version"`
		Scope      string `xml:"scope"`
	}) {
		for _, d := range xmlDeps {
			// Skip dependencies with property placeholders or no version.
			if d.Version == "" || strings.Contains(d.Version, "${") {
				continue
			}
			// Skip test scope.
			if d.Scope == "test" {
				continue
			}
			key := d.GroupID + ":" + d.ArtifactID + ":" + d.Version
			if seen[key] {
				continue
			}
			seen[key] = true
			deps = append(deps, JavaDependency{
				GroupID:    d.GroupID,
				ArtifactID: d.ArtifactID,
				Version:    d.Version,
				Scope:      d.Scope,
				Source:     "pom.xml",
			})
		}
	}

	addDeps(pom.Dependencies.Dependency)
	addDeps(pom.DependencyManagement.Dependencies.Dependency)

	return deps, nil
}

// parseBuildGradle extracts dependencies from a Gradle build file using regex.
func parseBuildGradle(dir string) ([]JavaDependency, error) {
	var deps []JavaDependency

	for _, name := range []string{"build.gradle", "build.gradle.kts"} {
		path := filepath.Join(dir, name)
		data, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		content := string(data)
		// Match patterns like: implementation 'group:artifact:version'
		// or: implementation("group:artifact:version")
		lines := strings.Split(content, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			// Skip comments.
			if strings.HasPrefix(line, "//") || strings.HasPrefix(line, "/*") {
				continue
			}

			// Extract dependency strings from various formats.
			for _, dep := range extractGradleDeps(line) {
				deps = append(deps, JavaDependency{
					GroupID:    dep.GroupID,
					ArtifactID: dep.ArtifactID,
					Version:    dep.Version,
					Scope:      dep.Scope,
					Source:     name,
				})
			}
		}
		break // Only parse the first found file.
	}

	return deps, nil
}

// extractGradleDeps extracts dependencies from a single Gradle line.
func extractGradleDeps(line string) []JavaDependency {
	var deps []JavaDependency

	// Determine scope from the configuration name.
	scope := "compile"
	scopeKeywords := map[string]string{
		"testImplementation":     "test",
		"testCompileOnly":        "test",
		"testRuntimeOnly":        "test",
		"implementation":         "compile",
		"compileOnly":            "compile",
		"runtimeOnly":            "runtime",
		"api":                    "compile",
		"compile":                "compile",
	}

	for keyword, sc := range scopeKeywords {
		if strings.Contains(line, keyword) {
			scope = sc
			break
		}
	}

	if scope == "test" {
		return nil
	}

	// Extract quoted dependency strings: 'group:artifact:version' or "group:artifact:version".
	for _, quote := range []byte{'\'', '"'} {
		parts := strings.Split(line, string(quote))
		for i := 1; i < len(parts); i += 2 {
			depStr := parts[i]
			fields := strings.Split(depStr, ":")
			if len(fields) >= 3 {
				deps = append(deps, JavaDependency{
					GroupID:    fields[0],
					ArtifactID: fields[1],
					Version:    fields[2],
					Scope:      scope,
				})
			}
		}
	}

	return deps
}

// extractJavaDependencies finds all Java dependencies from the project.
func extractJavaDependencies(workingDir string) ([]JavaDependency, error) {
	var allDeps []JavaDependency

	// Try pom.xml first.
	pomPath := filepath.Join(workingDir, "pom.xml")
	if deps, err := parsePomXML(pomPath); err == nil {
		allDeps = append(allDeps, deps...)
	}

	// Try build.gradle.
	if deps, err := parseBuildGradle(workingDir); err == nil {
		allDeps = append(allDeps, deps...)
	}

	return allDeps, nil
}

// runOSVScan queries OSV.dev for all project dependencies and returns findings.
func runOSVScan(ctx context.Context, workingDir string) (*OSVOutput, error) {
	deps, err := extractJavaDependencies(workingDir)
	if err != nil {
		return nil, fmt.Errorf("extract dependencies: %w", err)
	}

	if len(deps) == 0 {
		return &OSVOutput{}, nil
	}

	output := &OSVOutput{
		TotalDeps: len(deps),
	}

	vulnDepsSet := make(map[string]bool)

	// Query OSV.dev for each dependency (rate-limited).
	for _, dep := range deps {
		result, err := queryOSV(ctx, dep.GroupID, dep.ArtifactID, dep.Version)
		if err != nil {
			output.Errors = append(output.Errors, err.Error())
			continue
		}

		if len(result.Vulns) == 0 {
			continue
		}

		vulnDepsSet[dep.GroupID+":"+dep.ArtifactID] = true

		for _, vuln := range result.Vulns {
			finding := OSVFinding{
				CVEID:    vuln.ID,
				Package:  dep.GroupID + ":" + dep.ArtifactID,
				Version:  dep.Version,
				Summary:  vuln.Summary,
				Aliases:  vuln.Aliases,
				Affected: dep,
			}

			// Extract severity.
			if len(vuln.Severity) > 0 {
				finding.Severity = vuln.Severity[0].Score
			}
			if finding.Severity == "" {
				for _, affected := range vuln.Affected {
					if affected.DatabaseSpecific.Severity != "" {
						finding.Severity = affected.DatabaseSpecific.Severity
						break
					}
				}
			}

			// Extract CWE IDs.
			for _, affected := range vuln.Affected {
				finding.CWEIds = append(finding.CWEIds, affected.DatabaseSpecific.CWEIds...)
			}

			// Extract fixed version.
			for _, affected := range vuln.Affected {
				for _, r := range affected.Ranges {
					for _, e := range r.Events {
						if e.Fixed != "" {
							finding.FixedIn = e.Fixed
						}
					}
				}
			}

			output.Findings = append(output.Findings, finding)
		}

		// Small delay to avoid rate limiting.
		select {
		case <-ctx.Done():
			return output, ctx.Err()
		case <-time.After(100 * time.Millisecond):
		}
	}

	output.VulnDeps = len(vulnDepsSet)
	output.TotalCVEs = len(output.Findings)

	return output, nil
}

// formatOSVResults formats OSV scan results for the tool response.
func formatOSVResults(output *OSVOutput, maxFindings int) string {
	if output.TotalCVEs == 0 && len(output.Errors) == 0 {
		return fmt.Sprintf("OSV.dev scan: %d dependencies checked, no known vulnerabilities found.", output.TotalDeps)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# OSV.dev Component Vulnerability Scan\n\n"))
	sb.WriteString(fmt.Sprintf("**Dependencies scanned:** %d\n", output.TotalDeps))
	sb.WriteString(fmt.Sprintf("**Vulnerable dependencies:** %d\n", output.VulnDeps))
	sb.WriteString(fmt.Sprintf("**Total CVEs:** %d\n\n", output.TotalCVEs))

	if len(output.Findings) == 0 {
		sb.WriteString("No known vulnerabilities found.\n")
	} else {
		findings := output.Findings
		truncated := false
		if len(findings) > maxFindings {
			findings = findings[:maxFindings]
			truncated = true
		}

		// Group by package.
		pkgFindings := map[string][]OSVFinding{}
		for _, f := range findings {
			pkgFindings[f.Package] = append(pkgFindings[f.Package], f)
		}

		for pkg, pkgfs := range pkgFindings {
			sb.WriteString(fmt.Sprintf("## %s@%s\n\n", pkg, pkgfs[0].Version))
			for _, f := range pkgfs {
				icon := "🔴"
				if f.Severity == "MODERATE" || f.Severity == "MEDIUM" {
					icon = "🟠"
				} else if f.Severity == "LOW" {
					icon = "🔵"
				}

				sb.WriteString(fmt.Sprintf("%s **%s**", icon, f.CVEID))
				if f.Summary != "" {
					sb.WriteString(fmt.Sprintf(": %s", f.Summary))
				}
				sb.WriteString("\n")

				if f.FixedIn != "" {
					sb.WriteString(fmt.Sprintf("  Fix: upgrade to %s\n", f.FixedIn))
				}
				if len(f.Aliases) > 0 {
					sb.WriteString(fmt.Sprintf("  Aliases: %s\n", strings.Join(f.Aliases, ", ")))
				}
				if len(f.CWEIds) > 0 {
					sb.WriteString(fmt.Sprintf("  CWE: %s\n", strings.Join(f.CWEIds, ", ")))
				}
				sb.WriteString("\n")
			}
		}

		if truncated {
			sb.WriteString(fmt.Sprintf("\n... showing %d of %d CVEs. Use max_findings parameter to see more.\n", maxFindings, output.TotalCVEs))
		}
	}

	if len(output.Errors) > 0 {
		sb.WriteString(fmt.Sprintf("\n**Errors:** %d query failures (network/rate-limit). Results may be incomplete.\n", len(output.Errors)))
	}

	return sb.String()
}
