import React from 'react';

interface UserBadgeProps {
  username: string;
  displayName: string;
  isSelf?: boolean;
  role?: string;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showHandle?: boolean;
  className?: string;
}

export const GoldenVerifiedCheckmark: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
    >
      <title>Verified Administrator</title>
      <circle cx="12" cy="12" r="10" fill="#EAB308" />
      <path
        d="M8.5 12.5L11 15L16 9.5"
        stroke="#1E1B4B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const ChatterOrgSquareBadge: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[3px] bg-gradient-to-br from-sky-400 to-sky-600 text-[#090e17] font-black shrink-0 shadow-sm leading-none border border-sky-300/40 select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.round(size * 0.72)}px`,
      }}
      title="Chatter Official Organization"
    >
      C
    </span>
  );
};

export const BlueVerifiedCheckmark: React.FC<{ size?: number; className?: string }> = ({
  size = 15,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`inline-block shrink-0 ${className}`}
    >
      <title>Verified Account</title>
      <circle cx="12" cy="12" r="10" fill="#0284c7" />
      <path
        d="M8.5 12.5L11 15L16 9.5"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const UserBadge: React.FC<UserBadgeProps> = ({
  username,
  displayName,
  isSelf = false,
  role = 'user',
  isVerified = false,
  size = 'sm',
  showHandle = false,
  className = '',
}) => {
  const cleanUser = username ? username.toLowerCase().replace(/^@/, '').trim() : '';
  const cleanDisplay = displayName ? displayName.toLowerCase().replace(/^@/, '').trim() : '';
  const isNeo =
    cleanUser === 'a321-251n' ||
    cleanDisplay === 'neo' ||
    cleanUser === 'neo' ||
    role === 'admin';

  const formattedName = displayName ? `@${displayName.replace(/^@/, '')}` : `@${username.replace(/^@/, '')}`;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-bold',
  }[size];

  if (isNeo) {
    return (
      <span className={`inline-flex items-center gap-1 font-bold ${sizeClasses} ${className}`}>
        <span className="neo-flame-cycle truncate max-w-[200px]" title={`@${username}`}>
          {formattedName}
        </span>
        <GoldenVerifiedCheckmark size={size === 'lg' ? 20 : 15} />
        <ChatterOrgSquareBadge size={size === 'lg' ? 18 : 14} />
        {showHandle && (
          <span className="text-xs text-slate-400 font-normal ml-1">@{username}</span>
        )}
      </span>
    );
  }

  // Normal user styling
  const colorStyle = isSelf
    ? { color: 'var(--name-self)' }
    : { color: 'var(--name-other)' };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium truncate max-w-[200px] ${sizeClasses} ${className}`}
      style={colorStyle}
      title={`@${username}`}
    >
      <span className="truncate">{formattedName}</span>
      {isVerified && (
        <BlueVerifiedCheckmark size={size === 'lg' ? 19 : 14} />
      )}
      {role === 'mod' && (
        <span className="px-1.5 py-0.2 bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded text-[10px] font-semibold">
          MOD
        </span>
      )}
      {showHandle && (
        <span className="text-xs opacity-70 ml-1">@{username}</span>
      )}
    </span>
  );
};
