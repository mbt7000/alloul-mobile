/**
 * Tailwind Glassmorphism Plugin
 * Tailwind utilities for glass effect components
 */

export const glassPlugin = {
  // Glass variant utilities
  '.glass': {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  },

  '.glass-sm': {
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(4px) saturate(180%)',
    WebkitBackdropFilter: 'blur(4px) saturate(180%)',
  },

  '.glass-lg': {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
  },

  '.glass-xl': {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
  },

  // Accent variants
  '.glass-accent-cyan': {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(0, 212, 255, 0.1))',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.2)',
  },

  '.glass-accent-purple': {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(168, 85, 247, 0.1))',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.1), 0 8px 24px rgba(0, 0, 0, 0.2)',
  },

  '.glass-accent-emerald': {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5), rgba(16, 185, 129, 0.1))',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.1), 0 8px 24px rgba(0, 0, 0, 0.2)',
  },

  // Text utilities
  '.glass-text': {
    color: '#f1f5f9',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },

  '.glass-text-muted': {
    color: '#cbd5e1',
    opacity: '0.8',
  },

  // Button utilities
  '.glass-btn': {
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f1f5f9',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',

    '&:hover': {
      background: 'rgba(15, 23, 42, 0.5)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
      transform: 'translateY(-2px)',
    },

    '&:active': {
      transform: 'translateY(0)',
    },
  },

  '.glass-btn-primary': {
    background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
    border: 'none',
    color: '#050810',
    fontWeight: '600',

    '&:hover': {
      boxShadow: '0 0 30px rgba(0, 212, 255, 0.4), 0 12px 32px rgba(0, 0, 0, 0.3)',
    },
  },

  // Input utilities
  '.glass-input': {
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f1f5f9',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    transition: 'all 0.3s ease',

    '&::placeholder': {
      color: '#94a3b8',
    },

    '&:focus': {
      outline: 'none',
      borderColor: '#00d4ff',
      background: 'rgba(15, 23, 42, 0.5)',
      boxShadow: '0 0 20px rgba(0, 212, 255, 0.2), 0 12px 32px rgba(0, 0, 0, 0.3)',
    },
  },

  // Modal utilities
  '.glass-modal': {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1.5rem',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
    padding: '2rem',
  },

  '.glass-overlay': {
    background: 'rgba(5, 8, 16, 0.7)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
};
