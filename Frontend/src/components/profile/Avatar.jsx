function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

export default function Avatar({ name, imageSrc, size = 'md', className = '' }) {
  const sizeClass = SIZES[size] ?? SIZES.md;

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={name}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`rounded-full bg-blue-600 text-white font-bold flex items-center justify-center select-none shrink-0 ${sizeClass} ${className}`}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
