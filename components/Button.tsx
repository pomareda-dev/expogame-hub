import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyle = "rounded-xl font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-brand-500 hover:bg-brand-400 text-white shadow-brand-900/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    danger: "bg-rose-500 hover:bg-rose-400 text-white",
    ghost: "bg-transparent hover:bg-white/10 text-white shadow-none",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};