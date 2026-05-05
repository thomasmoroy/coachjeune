import React from 'react';

interface IconProps {
  className?: string;
}

export const CheckIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

export const SunIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const GitHubIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const SupabaseIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.944 0c-1.4 0-2.8.5-3.9 1.5L1.5 7.5C.5 8.5 0 9.9 0 11.3s.5 2.8 1.5 3.8l6.5 6c1 .9 2.4 1.4 3.8 1.4s2.8-.5 3.8-1.5l6.5-6c1-.9 1.5-2.3 1.5-3.7s-.5-2.8-1.5-3.8l-6.5-6C14.7.5 13.3 0 11.9 0zm0 2c.9 0 1.8.3 2.5 1l6.5 6c.7.6 1 1.5 1 2.4s-.4 1.8-1 2.4l-6.5 6c-.7.6-1.6 1-2.5 1s-1.8-.4-2.5-1l-6.5-6c-.7-.6-1-1.5-1-2.4s.4-1.8 1-2.4l6.5-6c.7-.7 1.6-1 2.5-1z"/>
  </svg>
);

export const RobotIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg className={`w-8 h-8 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
