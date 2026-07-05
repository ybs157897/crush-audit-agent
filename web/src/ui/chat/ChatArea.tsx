import { useEffect, useRef, useState, useCallback } from 'react';

import { pantera } from '../../theme/pantera';

import type { Message } from '../../api/client';

import { ChatMessage } from './messages/ChatMessage';
import { mergeMessagesForDisplay } from './messages/messageDisplay';



function timeGreeting(): string {

  const h = new Date().getHours();

  if (h < 6) return '夜深了，注意休息';

  if (h < 12) return '早上好';

  if (h < 14) return '中午好';

  if (h < 18) return '下午好';

  if (h < 22) return '晚上好呀，今天辛苦啦';

  return '夜深了，注意休息';

}



export function ChatArea({

  messages, isBusy, focused, showGreeting = true,

}: {

  messages: Message[];

  isBusy: boolean;

  focused?: boolean;

  showGreeting?: boolean;

}) {

  const bottomRef = useRef<HTMLDivElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const empty = messages.length === 0;
  const displayMessages = mergeMessagesForDisplay(messages);



  const scrollToBottom = useCallback((smooth = true) => {

    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });

  }, []);



  useEffect(() => {

    if (!empty) scrollToBottom(true);

  }, [messages, isBusy, empty, scrollToBottom]);



  useEffect(() => {

    const el = containerRef.current;

    if (!el || empty) return;



    const onScroll = () => {

      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;

      setShowScrollBtn(gap > 120);

    };



    onScroll();

    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(onScroll);

    ro.observe(el);

    return () => {

      el.removeEventListener('scroll', onScroll);

      ro.disconnect();

    };

  }, [empty, messages.length]);



  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (!focused || !containerRef.current) return;

      const el = containerRef.current;

      if (e.key === 'g' && !e.shiftKey) { el.scrollTop = 0; e.preventDefault(); }

      if (e.key === 'G' || (e.key === 'g' && e.shiftKey)) { scrollToBottom(true); e.preventDefault(); }

      if (e.key === 'j') { el.scrollTop += 40; e.preventDefault(); }

      if (e.key === 'k') { el.scrollTop -= 40; e.preventDefault(); }

      if (e.key === 'PageDown' || e.key === ' ') { el.scrollTop += el.clientHeight; e.preventDefault(); }

      if (e.key === 'PageUp') { el.scrollTop -= el.clientHeight; e.preventDefault(); }

    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);

  }, [focused, scrollToBottom]);



  return (

    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      <div

        ref={containerRef}

        tabIndex={focused ? 0 : -1}

        style={{

          flex: 1,

          overflow: 'auto',

          outline: focused ? `1px solid ${pantera.primary}40` : 'none',

          display: 'flex',

          flexDirection: 'column',

          minHeight: 0,

        }}

      >

        {empty && showGreeting && (

          <div style={{

            flex: 1,

            display: 'flex',

            flexDirection: 'column',

            alignItems: 'center',

            justifyContent: 'center',

            color: pantera.fgMoreSubtle,

            paddingBottom: 24,

            minHeight: 200,

          }}>

            <div style={{ fontSize: 22, fontWeight: 500, color: pantera.fgBase, marginBottom: 8 }}>

              {timeGreeting()}

            </div>

            <div style={{ fontSize: 13, color: pantera.fgMostSubtle }}>

              在下方输入任务，选择模型后即可开始

            </div>

          </div>

        )}



        {!empty && displayMessages.map((m) => (

          <ChatMessage key={m.id} message={m} />

        ))}



        {!empty && isBusy && (

          <div style={{ padding: '12px 4px', color: pantera.busy, fontSize: 12, display: 'flex', gap: 8 }}>

            <span className="crush-spin">◌</span>

            正在回复...

          </div>

        )}

        <div ref={bottomRef} />

      </div>



      {showScrollBtn && (

        <button

          type="button"

          onClick={() => scrollToBottom(true)}

          title="滚动到底部"

          style={{

            position: 'absolute',

            bottom: 12,

            left: '50%',

            transform: 'translateX(-50%)',

            width: 32,

            height: 32,

            borderRadius: '50%',

            border: `1px solid ${pantera.separator}`,

            background: pantera.bgMostVisible,

            color: pantera.fgMoreSubtle,

            cursor: 'pointer',

            fontSize: 14,

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            boxShadow: `0 2px 8px ${pantera.bgBase}80`,

            zIndex: 2,

          }}

        >

          ↓

        </button>

      )}

    </div>

  );

}

