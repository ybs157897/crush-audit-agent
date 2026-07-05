import { useEffect, useRef, useState } from 'react';
import { pantera } from '../../../theme/pantera';

const CHARS_PER_TICK = 8;
const TICK_MS = 16;
const BIG_JUMP = 400;

/**
 * Progressively reveals text so large chunks (tool output, file content)
 * feel streamed instead of popping in all at once.
 */
export function useStreamingReveal(text: string, active: boolean): string {
  const [visibleLen, setVisibleLen] = useState(active ? 0 : text.length);
  const prevTextRef = useRef(text);
  const prevActiveRef = useRef(active);

  useEffect(() => {
    if (!active) {
      setVisibleLen(text.length);
      prevTextRef.current = text;
      prevActiveRef.current = active;
      return;
    }

    const prev = prevTextRef.current;
    const grew = text.length > prev.length;
    const wasInactive = !prevActiveRef.current;

    if (wasInactive && text.length > 0) {
      setVisibleLen(0);
    } else if (grew && text.length - prev.length > BIG_JUMP) {
      setVisibleLen((n) => Math.min(n, prev.length));
    }

    prevTextRef.current = text;
    prevActiveRef.current = active;
  }, [text, active]);

  useEffect(() => {
    if (!active) return;
    if (visibleLen >= text.length) return;

    const jump = text.length - visibleLen;
    const step = jump > BIG_JUMP ? CHARS_PER_TICK * 3 : CHARS_PER_TICK;

    const timer = window.setTimeout(() => {
      setVisibleLen((n) => Math.min(text.length, n + step));
    }, TICK_MS);

    return () => window.clearTimeout(timer);
  }, [text, active, visibleLen]);

  return text.slice(0, visibleLen);
}

export function StreamingPlainText({
  text,
  active,
  style,
}: {
  text: string;
  active: boolean;
  style?: React.CSSProperties;
}) {
  const visible = useStreamingReveal(text, active);

  return (
    <div style={{
      margin: 0,
      fontSize: 14,
      lineHeight: 1.65,
      color: pantera.fgMoreSubtle,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      ...style,
    }}
    >
      {visible}
      {active && visible.length < text.length && (
        <span style={{ color: pantera.busy }}>▍</span>
      )}
    </div>
  );
}
