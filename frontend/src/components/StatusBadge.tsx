import React from 'react';

interface StatusBadgeProps {
  status: 'success' | 'failed' | 'pending' | 'running';
  text?: string;
}

export default function StatusBadge({ status, text }: StatusBadgeProps) {
  const configs = {
    success: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: '✓',
      label: text || 'Success',
    },
    failed: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: '✗',
      label: text || 'Failed',
    },
    pending: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: '⏳',
      label: text || 'Pending',
    },
    running: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: '⟳',
      label: text || 'Running',
    },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}
