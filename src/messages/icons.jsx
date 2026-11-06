import React from 'react';

const paths = {
  hash: <path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.8.7 3 2.4 3 4.6" /></>,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14.2c.9 1.1 2 1.6 3.5 1.6s2.6-.5 3.5-1.6M9 9.6v.2M15 9.6v.2" /></>,
  sticker: <><path d="M20 12.5V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h5.5z" /><path d="M20 12.5h-3a4.5 4.5 0 0 0-4.5 4.5V20" /></>,
  send: <path d="M4 12 20 4l-5 16-3.5-6.5z M11.5 13.5 20 4" />,
  reply: <path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6v1" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  back: <path d="m15 5-7 7 7 7" />,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 21h4" />,
  bellOff: <path d="M6 16V11c0-1 .2-1.900.7-2.700M9.500 4.800A6 6 0 0 1 18 11v5l1.500 2H8M10 21h4M4 4l16 16" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.500 8.500-2 5-5 2 2-5z" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  gear: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  check: <path d="m5 12.500 4.500 4.500L19 7" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  sidebar: <><rect x="3.500" y="4.500" width="17" height="15" rx="2.500" /><path d="M15 4.500v15" /></>,
};

export default function Icon({ name, size = 18, className = '' }) {
  return <svg className={`mx-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
