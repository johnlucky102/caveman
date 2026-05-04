import React, { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  /** Image source URL */
  src?: string | null;
  /** Alt text for the image */
  alt?: string;
  /** Display name used to generate initials fallback */
  name?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Additional className */
  className?: string;
  /** Show online status indicator */
  online?: boolean;
  /** Click handler */
  onClick?: () => void;
}

// ─── Size config ──────────────────────────────────────────────────────────────

const sizeConfig: Record<AvatarSize, { container: string; text: string; dot: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[9px]', dot: 'w-1.5 h-1.5 border' },
  sm: { container: 'w-8 h-8', text: 'text-xs', dot: 'w-2 h-2 border' },
  md: { container: 'w-10 h-10', text: 'text-sm', dot: 'w-2.5 h-2.5 border-2' },
  lg: { container: 'w-12 h-12', text: 'text-base', dot: 'w-3 h-3 border-2' },
  xl: { container: 'w-16 h-16', text: 'text-lg', dot: 'w-3.5 h-3.5 border-2' },
};

// ─── Helper: generate initials ────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Helper: deterministic color from name ────────────────────────────────────

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-secondary/20 text-secondary-600',
  'bg-purple-100 text-purple-600',
  'bg-amber-100 text-amber-600',
  'bg-emerald-100 text-emerald-600',
  'bg-blue-100 text-blue-600',
  'bg-pink-100 text-pink-600',
  'bg-indigo-100 text-indigo-600',
];

function getColorClass(name?: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Avatar Component ─────────────────────────────────────────────────────────

/**
 * Avatar with image, initials fallback, and optional online indicator.
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  size = 'md',
  className,
  online,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const config = sizeConfig[size];
  const initials = getInitials(name);
  const colorClass = getColorClass(name);
  const showImage = src && !imgError;

  return (
    <div
      className={cn('relative inline-flex shrink-0', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-semibold select-none',
          config.container,
          !showImage && colorClass
        )}
        aria-label={alt || name || 'Avatar'}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : initials ? (
          <span className={config.text}>{initials}</span>
        ) : (
          <User className={cn('text-[#94A3B8]', size === 'xs' ? 'w-3 h-3' : 'w-4 h-4')} />
        )}
      </div>

      {/* Online indicator */}
      {online != null && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white',
            config.dot,
            online ? 'bg-emerald-500' : 'bg-[#CBD5E1]'
          )}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

// ─── Avatar Group ─────────────────────────────────────────────────────────────

interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name?: string; alt?: string }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

/**
 * Stacked group of avatars with overflow count.
 */
export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'sm',
  className,
}) => {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((a, i) => (
        <div key={i} className="-ml-2 first:ml-0 border-2 border-white rounded-full">
          <Avatar src={a.src} name={a.name} alt={a.alt} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            '-ml-2 border-2 border-white rounded-full bg-[#F1F5F9] flex items-center justify-center font-semibold text-[#64748B]',
            config.container,
            config.text
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default Avatar;
export type { AvatarProps, AvatarSize };
