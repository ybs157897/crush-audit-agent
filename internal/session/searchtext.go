package session

import (
	"strings"

	"github.com/charmbracelet/crush/internal/message"
)

const searchTextMaxChars = 200_000

// BuildSearchableText concatenates visible user/assistant text for search indexing.
func BuildSearchableText(messages []message.Message) string {
	var parts []string
	total := 0
	for _, msg := range messages {
		var chunks []string
		for _, part := range msg.Parts {
			switch c := part.(type) {
			case message.TextContent:
				if text := strings.TrimSpace(c.Text); text != "" {
					chunks = append(chunks, text)
				}
			case message.ReasoningContent:
				if text := strings.TrimSpace(c.Thinking); text != "" {
					chunks = append(chunks, text)
				}
			}
		}
		content := strings.TrimSpace(strings.Join(chunks, "\n"))
		if content == "" {
			continue
		}
		next := content
		if total > 0 {
			next = "\n" + content
		}
		if total+len(next) > searchTextMaxChars {
			remaining := searchTextMaxChars - total
			if remaining > 0 {
				parts = append(parts, next[:remaining])
			}
			break
		}
		parts = append(parts, next)
		total += len(next)
	}
	return strings.Join(parts, "")
}
