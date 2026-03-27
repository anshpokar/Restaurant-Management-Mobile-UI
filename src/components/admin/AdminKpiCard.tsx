import { motion } from 'motion/react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface AdminKpiCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  variant?: 'primary' | 'gold' | 'glass';
  index: number;
}

export function AdminKpiCard({ label, value, change, trend, icon: Icon, variant = 'glass', index }: AdminKpiCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-br from-brand-maroon to-[#5D1227] text-white shadow-brand-maroon/20';
      case 'gold':
        return 'bg-gradient-to-br from-brand-gold to-[#B8962D] text-white shadow-brand-gold/20';
      default:
        return 'bg-white/80 backdrop-blur-md border border-white/20 shadow-xl';
    }
  };

  const getIconContainerStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-white/20 ring-1 ring-white/30';
      case 'gold':
        return 'bg-white/20 ring-1 ring-white/30';
      default:
        return 'bg-brand-maroon/10 ring-1 ring-brand-maroon/20';
    }
  };

  const getIconColor = () => {
    return variant === 'glass' ? 'text-brand-maroon' : 'text-white';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden p-5 rounded-3xl shadow-lg ${getVariantStyles()}`}
    >
      {/* Background Subtle Shape */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-2xl ${getIconContainerStyles()}`}>
            <Icon className={`w-6 h-6 ${getIconColor()}`} />
          </div>
          
          {change && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              trend === 'up' 
                ? 'bg-green-500/20 text-green-600' 
                : trend === 'down' 
                ? 'bg-red-500/20 text-red-600' 
                : 'bg-muted/30 text-muted-foreground'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>

        <div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
            variant === 'glass' ? 'text-muted-foreground' : 'text-white/70'
          }`}>
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <motion.span 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
              className="text-3xl font-black tracking-tighter"
            >
              {value}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none opacity-50" />
    </motion.div>
  );
}
