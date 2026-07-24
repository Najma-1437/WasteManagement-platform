import { useState } from 'react';
import { C } from './theme';

const css = `
  .wm-tip-wrap { position: relative; display: inline-flex; align-items: center; }
  .wm-tip-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 16px; height: 16px; border-radius: 50%;
    background: ${C.border}; color: ${C.muted};
    font-size: 11px; font-weight: 700; cursor: help;
    border: none; padding: 0; font-family: inherit; line-height: 1;
  }
  .wm-tip-badge:hover, .wm-tip-badge:focus { background: ${C.primary}; color: #fff; outline: none; }
  .wm-tip-bubble {
    position: absolute; bottom: calc(100% + 8px); left: 50%;
    transform: translateX(-50%);
    background: #fff; color: ${C.text};
    border: 1px solid ${C.border}; border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.22);
    padding: 10px 12px; font-size: 12px; line-height: 1.5;
    width: max-content; max-width: 220px;
    z-index: 600;
  }
`;

/**
 * A small (?) badge that shows an explanatory bubble on hover/focus, for
 * flagging fields or steps where the user might be uncertain.
 */
export default function Tooltip({ text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="wm-tip-wrap">
      <style>{css}</style>
      <button
        type="button"
        className="wm-tip-badge"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label={text}
      >
        ?
      </button>
      {visible && <span className="wm-tip-bubble" role="tooltip">{text}</span>}
    </span>
  );
}
