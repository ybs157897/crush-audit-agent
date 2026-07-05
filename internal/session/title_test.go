package session

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestTruncateFirstInput(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name   string
		text   string
		maxLen int
		want   string
	}{
		{name: "empty", text: "   ", want: ""},
		{name: "trim and collapse", text: "  hello   world  ", want: "hello world"},
		{name: "short", text: "你好世界", maxLen: 50, want: "你好世界"},
		{name: "truncate runes", text: strings.Repeat("字", 60), maxLen: 10, want: strings.Repeat("字", 9) + "…"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			maxLen := tt.maxLen
			if maxLen == 0 {
				maxLen = 50
			}
			require.Equal(t, tt.want, TruncateFirstInput(tt.text, maxLen))
		})
	}
}

func TestCanAutoSetTitle(t *testing.T) {
	t.Parallel()

	require.True(t, CanAutoSetTitle(Session{Title: "Untitled Session", TitleSource: TitleSourceDefault}))
	require.True(t, CanAutoSetTitle(Session{Title: "新会话", TitleSource: TitleSourceFirstInput}))
	require.False(t, CanAutoSetTitle(Session{Title: "My chat", TitleOverridden: true}))
	require.False(t, CanAutoSetTitle(Session{Title: "Custom", TitleSource: TitleSourceCustom}))
	require.False(t, CanAutoSetTitle(Session{Title: "Renamed", TitleSource: TitleSourceGenerated}))
}
