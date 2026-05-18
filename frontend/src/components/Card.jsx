import React from 'react';

export const Card = ({ children, className = '', title, subtitle, footer, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`glass rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all ${onClick ? 'cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]' : ''} ${className}`}
    >
      <div>
        {(title || subtitle) && (
          <div className="mb-4">
            {title && <h3 className="text-lg font-bold text-slate-200">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
      {footer && <div className="mt-5 pt-4 border-t border-slate-800/85">{footer}</div>}
    </div>
  );
};

export const MetricCard = ({ title, value, unit, icon: Icon, color = 'emerald', progress, detail }) => {
  const colorMaps = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      bar: 'bg-emerald-500',
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      bar: 'bg-blue-500',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      bar: 'bg-amber-500',
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      bar: 'bg-rose-500',
    },
    violet: {
      text: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      bar: 'bg-violet-500',
    },
  };

  const scheme = colorMaps[color] || colorMaps.emerald;

  return (
    <Card className={`relative overflow-hidden ${scheme.border}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold text-slate-100">{value}</span>
            {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${scheme.bg} ${scheme.text}`}>
            <Icon size={20} />
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
            <span>{Math.round(progress)}%</span>
            {detail && <span>{detail}</span>}
          </div>
        </div>
      )}

      {!progress && detail && (
        <p className="text-xs text-slate-400 mt-2 font-medium">{detail}</p>
      )}
    </Card>
  );
};
export default Card;
