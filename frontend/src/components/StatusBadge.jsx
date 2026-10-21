import React from 'react';

export function PriorityBadge({ priority }) {
  const p = (priority || 'medium').toLowerCase();
  const cls = `pill pill-${p}`;
  return <span className={cls}>{priority}</span>;
}

export function StatusBadge({ status }) {
  const s = (status || 'open').toLowerCase().replace(/\s+/g, '');
  const cls = `pill pill-${s}`;
  return <span className={cls}>{status}</span>;
}

export function CategoryBadge({ category }) {
  return (
    <span
      style={{
        backgroundColor: '#f1f5f9',
        color: '#334155',
        fontSize: '0.75rem',
        padding: '3px 8px',
        borderRadius: '4px',
        fontWeight: '500',
        display: 'inline-block',
      }}
    >
      {category}
    </span>
  );
}
