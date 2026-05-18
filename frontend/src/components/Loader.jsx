import React from 'react';

export const Loader = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-t-emerald-500 border-r-transparent border-b-emerald-500 border-l-transparent ${sizeClasses[size]}`}></div>
    </div>
  );
};

export const ScreenLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <Loader size="lg" />
      <p className="mt-4 text-emerald-400 font-medium animate-pulse">Chargement de votre assistant nutrition...</p>
    </div>
  );
};
