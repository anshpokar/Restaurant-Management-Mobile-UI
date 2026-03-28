// SpiceLevel component to render chilli icons based on spice level strings.

type SpiceLevelType = 'mild' | 'medium' | 'spicy' | 'extra_spicy' | string;

interface SpiceLevelProps {
  level?: SpiceLevelType;
  className?: string;
}

export function SpiceLevel({ level, className = '' }: SpiceLevelProps) {
  if (!level) return null;

  const getChillies = (l: string) => {
    const normalized = l.toLowerCase().replace(/[^a-z]/g, '');
    switch (normalized) {
      case 'mild': return '🌶️';
      case 'medium': 
      case 'normal':
      case 'regular': return '🌶️🌶️';
      case 'spicy': 
      case 'hot': return '🌶️🌶️🌶️';
      case 'extraspicy':
      case 'extra_spicy':
      case 'veryhot': return '🌶️🌶️🌶️🌶️';
      default: return null;
    }
  };

  const chillies = getChillies(level);
  if (!chillies) return <span className={`text-[10px] uppercase font-black text-brand-maroon/80 ${className}`}>{level}</span>;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={level}>
      <span className="text-xs leading-none">{chillies}</span>
    </span>
  );
}
