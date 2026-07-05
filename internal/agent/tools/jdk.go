package tools

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const jdkVersion = "17.0.19+10"

// jdk17MirrorURLs lists the download URLs for JDK 17, ordered by priority (Chinese mirrors first).
var jdk17MirrorURLs = []struct {
	name string
	win  string // Windows zip
	linux string // Linux tar.gz
}{
	{
		name:  "Tsinghua (清华)",
		win:   "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/windows/OpenJDK17U-jdk_x64_windows_hotspot_17.0.19_10.zip",
		linux: "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/linux/OpenJDK17U-jdk_x64_linux_hotspot_17.0.19_10.tar.gz",
	},
	{
		name:  "Huawei (华为)",
		win:   "https://repo.huaweicloud.com/java/jdk/17.0.19+10/OpenJDK17U-jdk_x64_windows_hotspot_17.0.19_10.zip",
		linux: "https://repo.huaweicloud.com/java/jdk/17.0.19+10/OpenJDK17U-jdk_x64_linux_hotspot_17.0.19_10.tar.gz",
	},
	{
		name:  "Adoptium Official",
		win:   "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.19%2B10/OpenJDK17U-jdk_x64_windows_hotspot_17.0.19_10.zip",
		linux: "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.19%2B10/OpenJDK17U-jdk_x64_linux_hotspot_17.0.19_10.tar.gz",
	},
}

// findJavaPath locates a usable java binary.
// Priority: 1) system PATH, 2) bundled tools/jdk17/, 3) empty string if not found.
func findJavaPath(workingDir string) string {
	// 1. Check system PATH.
	if javaPath, err := exec.LookPath("java"); err == nil {
		return javaPath
	}

	// 2. Check bundled JDK in project.
	bundledJava := bundledJDKPath(workingDir)
	if bundledJava != "" {
		return bundledJava
	}

	return ""
}

// bundledJDKPath returns the java binary path inside tools/jdk17/ if it exists.
func bundledJDKPath(workingDir string) string {
	jdkDir := filepath.Join(workingDir, "tools", "jdk17")
	if info, err := os.Stat(jdkDir); err != nil || !info.IsDir() {
		return ""
	}

	var javaBin string
	if runtime.GOOS == "windows" {
		javaBin = filepath.Join(jdkDir, fmt.Sprintf("jdk-%s", jdkVersion), "bin", "java.exe")
	} else {
		javaBin = filepath.Join(jdkDir, fmt.Sprintf("jdk-%s", jdkVersion), "bin", "java")
	}

	if _, err := os.Stat(javaBin); err == nil {
		return javaBin
	}
	return ""
}

// isJavaAvailable returns true if a java binary can be found.
func isJavaAvailable(workingDir string) bool {
	return findJavaPath(workingDir) != ""
}

// installJDK17 downloads and extracts JDK 17 to tools/jdk17/ relative to workingDir.
// It tries mirror URLs in order (Chinese mirrors first) and falls back on failure.
func installJDK17(ctx context.Context, workingDir string) (string, error) {
	jdkDir := filepath.Join(workingDir, "tools", "jdk17")
	if err := os.MkdirAll(jdkDir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create JDK directory: %w", err)
	}

	var url string
	for _, mirror := range jdk17MirrorURLs {
		if runtime.GOOS == "windows" {
			url = mirror.win
		} else {
			url = mirror.linux
		}

		if err := downloadAndInstallJDK(ctx, url, jdkDir); err != nil {
			// Try next mirror.
			continue
		}

		// Success: return the java path.
		javaPath := bundledJDKPath(workingDir)
		if javaPath != "" {
			return javaPath, nil
		}
		return "", fmt.Errorf("JDK downloaded but java binary not found at expected path")
	}

	return "", fmt.Errorf("failed to download JDK 17 from all mirrors (Tsinghua/Huawei/Adoptium)")
}

// downloadAndInstallJDK downloads a JDK archive from the given URL and extracts it to destDir.
func downloadAndInstallJDK(ctx context.Context, url, destDir string) error {
	downloadCtx, cancel := context.WithTimeout(ctx, 600*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(downloadCtx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 600 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d from %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if runtime.GOOS == "windows" {
		return extractZip(bytes.NewReader(body), int64(len(body)), destDir)
	}
	return extractTarGz(bytes.NewReader(body), destDir)
}

// extractZip extracts a zip archive to the destination directory.
func extractZip(r io.ReaderAt, size int64, destDir string) error {
	zipReader, err := zip.NewReader(r, size)
	if err != nil {
		return fmt.Errorf("failed to open zip: %w", err)
	}

	for _, f := range zipReader.File {
		fPath := filepath.Join(destDir, f.Name)

		// Prevent zip slip.
		if !strings.HasPrefix(filepath.Clean(fPath), filepath.Clean(destDir)+string(os.PathSeparator)) {
			continue
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(fPath, 0o755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(fPath), 0o755); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)
		rc.Close()
		outFile.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

// extractTarGz extracts a tar.gz archive to the destination directory.
func extractTarGz(r io.Reader, destDir string) error {
	gzReader, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("failed to open gzip: %w", err)
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar: %w", err)
		}

		target := filepath.Join(destDir, header.Name)

		// Prevent path traversal.
		if !strings.HasPrefix(filepath.Clean(target), filepath.Clean(destDir)+string(os.PathSeparator)) {
			continue
		}

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, os.FileMode(header.Mode)); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			outFile, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tarReader); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		case tar.TypeSymlink:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			_ = os.Symlink(header.Linkname, target)
		}
	}

	return nil
}
