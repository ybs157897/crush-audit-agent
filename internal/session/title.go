package session

import (
	"strings"
	"unicode/utf8"
)

// Title source values persisted in sessions.title_source.
const (
	TitleSourceDefault    = "default"
	TitleSourceFirstInput = "first_input"
	TitleSourceGenerated  = "generated"
	TitleSourceCustom     = "custom"
)

var defaultTitles = map[string]struct{}{
	"":                  {},
	"Untitled Session":  {},
	"New Session":       {},
	"新会话":               {},
	"无标题":               {},
}

// TruncateFirstInput derives a sidebar title from the first user message.
func TruncateFirstInput(text string, maxLen int) string {
	if maxLen <= 0 {
		maxLen = 50
	}
	line := strings.Join(strings.Fields(strings.TrimSpace(text)), " ")
	if line == "" {
		return ""
	}
	if utf8.RuneCountInString(line) <= maxLen {
		return line
	}
	runes := []rune(line)
	if len(runes) <= maxLen {
		return line
	}
	return string(runes[:maxLen-1]) + "…"
}

// IsDefaultTitle reports whether title is a placeholder.
func IsDefaultTitle(title string) bool {
	_, ok := defaultTitles[strings.TrimSpace(title)]
	return ok
}

// CanAutoSetTitle reports whether automatic title updates are allowed.
func CanAutoSetTitle(sess Session) bool {
	if sess.TitleOverridden {
		return false
	}
	if sess.TitleSource == TitleSourceCustom {
		return false
	}
	if sess.TitleSource == TitleSourceDefault || sess.TitleSource == "" {
		return true
	}
	if sess.TitleSource == TitleSourceFirstInput {
		return true
	}
	return IsDefaultTitle(sess.Title)
}
