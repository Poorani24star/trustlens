import { forwardRef } from 'react';

const Button = forwardRef(function Button({ children, variant = 'primary', size = 'md', className = '', ...props }, ref) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600',
    secondary: 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 focus-visible:outline-blue-600',
    ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-slate-400',
    outline:   'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
});

export default Button;
