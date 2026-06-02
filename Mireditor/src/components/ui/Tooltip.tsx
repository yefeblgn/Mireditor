import React, { useEffect, useRef, useState } from 'react';

interface TooltipProps {
  content: string;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  children: React.ReactElement;
}

export function Tooltip({ content, shortcut, side = 'right', delay = 400, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!wrapRef.current) return;
      const element = wrapRef.current.firstElementChild || wrapRef.current;
      const r = element.getBoundingClientRect();
      let x = 0, y = 0;
      const gap = 8;
      if (side === 'right')  { x = r.right + gap;  y = r.top + r.height / 2; }
      if (side === 'left')   { x = r.left - gap;   y = r.top + r.height / 2; }
      if (side === 'top')    { x = r.left + r.width / 2; y = r.top - gap; }
      if (side === 'bottom') { x = r.left + r.width / 2; y = r.bottom + gap; }
      setPos({ x, y });
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const transformMap: Record<string, string> = {
    right:  'translateY(-50%)',
    left:   'translateY(-50%) translateX(-100%)',
    top:    'translateX(-50%) translateY(-100%)',
    bottom: 'translateX(-50%)',
  };

  return (
    <>
      <div ref={wrapRef} onMouseEnter={show} onMouseLeave={hide} onMouseDown={hide} className="relative contents">
        {children}
      </div>
      {visible && (
        <div
          ref={tipRef}
          className="fixed pointer-events-none"
          style={{ 
            left: `${pos.x}px`, 
            top: `${pos.y}px`, 
            transform: transformMap[side],
            zIndex: 9000
          }}
        >
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg shadow-xl shadow-black/50 animate-tooltip-in">
            <span className="text-[11px] text-[#e0e0e0] font-medium whitespace-nowrap">{content}</span>
            {shortcut && (
              <span className="text-[9px] text-[#3b82f6] bg-[#1a2744] border border-[#2a3a6a] rounded px-1.5 py-0.5 font-mono font-semibold whitespace-nowrap">
                {shortcut}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
