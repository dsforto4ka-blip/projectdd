import { useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'VW';

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={`Фотография профиля: ${name}`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${SIZE_CLASSES[size]} rounded-full object-cover border border-neutral-200 dark:border-dark-border shrink-0`}
      />
    );
  }

  return (
    <div
      aria-label={`Аватар ${name}`}
      className={`${SIZE_CLASSES[size]} rounded-full bg-brand text-brand-ink font-semibold flex items-center justify-center shrink-0 border border-brand/30 select-none`}
    >
      {initials}
    </div>
  );
}
