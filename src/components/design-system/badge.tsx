import React from 'react';
import { Leaf, Drumstick } from 'lucide-react';

interface BadgeProps {
  variant?: 'veg' | 'nonveg' | 'success' | 'warning' | 'error' | 'info' | 'paid' | 'pending' | 'vacant' | 'occupied' | 'destructive' | 'secondary';
  children?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ variant = 'info', children, size = 'md', className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-medium';
  
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };
  
  const variantStyles = {
    veg: 'bg-green-50 text-green-700 border border-green-200',
    nonveg: 'bg-red-50 text-red-700 border border-red-200',
    success: 'bg-[#16A34A] text-white',
    warning: 'bg-[#F59E0B] text-white',
    error: 'bg-[#DC2626] text-white',
    info: 'bg-[#3B82F6] text-white',
    paid: 'bg-[#16A34A] text-white',
    pending: 'bg-[#F59E0B] text-white',
    vacant: 'bg-[#16A34A] text-white',
    occupied: 'bg-[#DC2626] text-white',
    destructive: 'bg-[#DC2626] text-white',
    secondary: 'bg-gray-100 text-gray-700 border border-gray-300',
  };
  
  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {variant === 'veg' && <Leaf className="w-3 h-3 mr-1" />}
      {variant === 'nonveg' && <Drumstick className="w-3 h-3 mr-1" />}
      {children}
    </span>
  );
}

export function VegBadge() {
  return (
    <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-green-600 rounded">
      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
    </div>
  );
}

export function NonVegBadge() {
  return (
    <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded">
      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
    </div>
  );
}
