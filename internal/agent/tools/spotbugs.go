package tools

import (
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// SpotBugs finding represents a single bug from SpotBugs XML output.
type SpotBugsFinding struct {
	Type       string `xml:"type,attr"`
	Priority   string `xml:"priority,attr"`
	Category   string `xml:"category,attr"`
	Message    string `xml:"message,attr"`
	LineNumber int    `xml:"lineNumber,attr"`
	ClassName  string `xml:"-"`
}

// SpotBugsOutput represents the parsed SpotBugs XML output.
type SpotBugsOutput struct {
	Findings []SpotBugsFinding
	Errors   []string
}

// spotBugsXMLBugCollection is the top-level XML element.
type spotBugsXMLBugCollection struct {
	XMLName xml.Name          `xml:"BugCollection"`
	Files   []spotBugsXMLFile `xml:"file"`
	Errors  spotBugsXMLErrors `xml:"Error"`
}

type spotBugsXMLFile struct {
	ClassName string               `xml:"classname,attr"`
	Bugs      []spotBugsXMLBugInst `xml:"BugInstance"`
}

type spotBugsXMLBugInst struct {
	Type       string `xml:"type,attr"`
	Priority   string `xml:"priority,attr"`
	Category   string `xml:"category,attr"`
	Message    string `xml:"message,attr"`
	LineNumber int    `xml:"lineNumber,attr"`
}

type spotBugsXMLErrors struct {
	Messages []string `xml:",chardata"`
}

const spotBugsVersion = "4.9.3"

// findSpotBugsDir locates the SpotBugs installation directory.
// It checks the bundled path (tools/spotbugs/ relative to workingDir) first,
// then falls back to the user cache directory.
func findSpotBugsDir(workingDir string) string {
	// Check bundled path: <workingDir>/tools/spotbugs/
	bundledDir := filepath.Join(workingDir, "tools", "spotbugs")
	if isSpotBugsAvailable(bundledDir) {
		return bundledDir
	}

	// Fall back to cache directory.
	cacheDir := spotBugsCacheDir()
	if isSpotBugsAvailable(cacheDir) {
		return cacheDir
	}

	// Return bundled path as default (will produce a clear error if not found).
	return bundledDir
}

// isSpotBugsAvailable checks if both SpotBugs and FindSecBugs jars exist in the given directory.
func isSpotBugsAvailable(dir string) bool {
	spotBugsJar := filepath.Join(dir, fmt.Sprintf("spotbugs-%s", spotBugsVersion), "lib", "spotbugs.jar")
	findSecBugsJar := filepath.Join(dir, "findsecbugs-plugin-1.12.0.jar")
	_, err1 := os.Stat(spotBugsJar)
	_, err2 := os.Stat(findSecBugsJar)
	return err1 == nil && err2 == nil
}

// spotBugsCacheDir returns the user-level cache directory for SpotBugs tools.
func spotBugsCacheDir() string {
	if runtime.GOOS == "windows" {
		localAppData := os.Getenv("LOCALAPPDATA")
		if localAppData == "" {
			localAppData = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
		}
		return filepath.Join(localAppData, "crush", "tools", "spotbugs")
	}
	homeDir, _ := os.UserHomeDir()
	return filepath.Join(homeDir, ".local", "share", "crush", "tools", "spotbugs")
}

// javaBuildSystem represents the type of Java build system detected.
type javaBuildSystem string

const (
	buildSystemMaven javaBuildSystem = "maven"
	buildSystemGradle javaBuildSystem = "gradle"
	buildSystemNone  javaBuildSystem = ""
)

// detectJavaBuildSystem checks for Maven or Gradle build files in the working directory.
func detectJavaBuildSystem(workingDir string) javaBuildSystem {
	if _, err := os.Stat(filepath.Join(workingDir, "pom.xml")); err == nil {
		return buildSystemMaven
	}
	if _, err := os.Stat(filepath.Join(workingDir, "build.gradle")); err == nil {
		return buildSystemGradle
	}
	if _, err := os.Stat(filepath.Join(workingDir, "build.gradle.kts")); err == nil {
		return buildSystemGradle
	}
	return buildSystemNone
}

// findCompiledClasses returns the path to compiled class files if they exist.
func findCompiledClasses(workingDir string, buildSys javaBuildSystem) string {
	candidates := []string{
		filepath.Join(workingDir, "target", "classes"),
		filepath.Join(workingDir, "build", "classes", "java", "main"),
		filepath.Join(workingDir, "build", "classes"),
		filepath.Join(workingDir, "out", "production", "classes"),
	}

	for _, c := range candidates {
		if info, err := os.Stat(c); err == nil && info.IsDir() {
			return c
		}
	}
	return ""
}

// compileJavaProject attempts to compile a Java project using Maven or Gradle.
func compileJavaProject(ctx context.Context, workingDir string, buildSys javaBuildSystem) error {
	compileCtx, cancel := context.WithTimeout(ctx, 300*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	switch buildSys {
	case buildSystemMaven:
		mvnPath, err := exec.LookPath("mvn")
		if err != nil {
			// Try mvnw wrapper.
			mvnw := filepath.Join(workingDir, "mvnw")
			if runtime.GOOS == "windows" {
				mvnw = filepath.Join(workingDir, "mvnw.cmd")
			}
			if _, err := os.Stat(mvnw); err == nil {
				mvnPath = mvnw
			} else {
				return fmt.Errorf("maven not found (mvn or mvnw required)")
			}
		}
		cmd = exec.CommandContext(compileCtx, mvnPath, "compile", "-q", "-B")

	case buildSystemGradle:
		gradlePath, err := exec.LookPath("gradle")
		if err != nil {
			gradlew := filepath.Join(workingDir, "gradlew")
			if runtime.GOOS == "windows" {
				gradlew = filepath.Join(workingDir, "gradlew.bat")
			}
			if _, err := os.Stat(gradlew); err == nil {
				gradlePath = gradlew
			} else {
				return fmt.Errorf("gradle not found (gradle or gradlew required)")
			}
		}
		cmd = exec.CommandContext(compileCtx, gradlePath, "compileJava", "-q")

	default:
		return fmt.Errorf("no build system detected")
	}

	cmd.Dir = workingDir
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	return cmd.Run()
}

// runSpotBugsScan executes SpotBugs on the given classpath and returns parsed findings.
func runSpotBugsScan(ctx context.Context, workingDir, classpath, scanPath, effort string) (*SpotBugsOutput, error) {
	javaPath := findJavaPath(workingDir)
	if javaPath == "" {
		return nil, fmt.Errorf("java not found. Use install_java=true to auto-install JDK 17, or install manually")
	}

	spotBugsDir := findSpotBugsDir(workingDir)
	if !isSpotBugsAvailable(spotBugsDir) {
		return nil, fmt.Errorf("SpotBugs not found in %s. Expected bundled tools at tools/spotbugs/ or cache at %s",
			spotBugsDir, spotBugsCacheDir())
	}

	spotBugsJar := filepath.Join(spotBugsDir, fmt.Sprintf("spotbugs-%s", spotBugsVersion), "lib", "spotbugs.jar")
	findSecBugsJar := filepath.Join(spotBugsDir, "findsecbugs-plugin-1.12.0.jar")

	effortLevel := "default"
	if effort != "" {
		effortLevel = effort
	}

	args := []string{
		"-jar", spotBugsJar,
		"-textui",
		"-xml:withMessages",
		"-effort:" + effortLevel,
		"-pluginList", findSecBugsJar,
		"-low",
	}

	// Add auxclasspath for the scan.
	if classpath != "" {
		args = append(args, "-auxclasspath", classpath)
	}

	args = append(args, scanPath)

	scanCtx, cancel := context.WithTimeout(ctx, 180*time.Second)
	defer cancel()

	cmd := exec.CommandContext(scanCtx, javaPath, args...)
	cmd.Dir = scanPath

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// SpotBugs returns non-zero exit code when bugs are found, which is normal.
	runErr := cmd.Run()
	if runErr != nil {
		if exitErr, ok := runErr.(*exec.ExitError); ok {
			// Exit code 1 or 2 means bugs found - this is normal.
			if exitErr.ExitCode() > 2 {
				errMsg := stderr.String()
				if errMsg == "" {
					errMsg = runErr.Error()
				}
				return nil, fmt.Errorf("spotbugs scan failed (exit code %d): %s", exitErr.ExitCode(), errMsg)
			}
		} else {
			return nil, fmt.Errorf("failed to run spotbugs: %w", runErr)
		}
	}

	return parseSpotBugsXML(stdout.Bytes())
}

// parseSpotBugsXML parses SpotBugs XML output into a structured result.
func parseSpotBugsXML(data []byte) (*SpotBugsOutput, error) {
	var collection spotBugsXMLBugCollection
	if err := xml.Unmarshal(data, &collection); err != nil {
		return nil, fmt.Errorf("failed to parse spotbugs XML: %w", err)
	}

	output := &SpotBugsOutput{}
	for _, f := range collection.Files {
		for _, bug := range f.Bugs {
			output.Findings = append(output.Findings, SpotBugsFinding{
				Type:       bug.Type,
				Priority:   bug.Priority,
				Category:   bug.Category,
				Message:    bug.Message,
				LineNumber: bug.LineNumber,
				ClassName:  f.ClassName,
			})
		}
	}

	if len(collection.Errors.Messages) > 0 {
		msg := strings.TrimSpace(collection.Errors.Messages[0])
		if msg != "" {
			output.Errors = append(output.Errors, msg)
		}
	}

	return output, nil
}

// spotBugsPriorityToSeverity converts SpotBugs priority to a severity label.
func spotBugsPriorityToSeverity(priority string) string {
	switch strings.ToLower(priority) {
	case "high":
		return "ERROR"
	case "normal":
		return "WARNING"
	case "low":
		return "INFO"
	default:
		return "INFO"
	}
}

// hasJavaFiles checks if the given directory contains any .java files.
func hasJavaFiles(dir string) bool {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	for _, e := range entries {
		if e.IsDir() {
			if e.Name() == "node_modules" || e.Name() == ".git" || e.Name() == "vendor" {
				continue
			}
			if hasJavaFiles(filepath.Join(dir, e.Name())) {
				return true
			}
			continue
		}
		if strings.HasSuffix(strings.ToLower(e.Name()), ".java") {
			return true
		}
	}
	return false
}
