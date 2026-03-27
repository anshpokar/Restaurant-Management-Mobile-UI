// SpiceLevel component to render chilli icons based on spice level strings.

type SpiceLevelType = 'mild' | 'medium' | 'spicy' | 'extra_spicy' | string;

interface SpiceLevelProps {
  level?: SpiceLevelType;
  className?: string;
}

export function SpiceLevel({ level, className = '' }: SpiceLevelProps) {
  if (!level) return null;

  const getChillies = (l: string) => {
    switch (l.toLowerCase()) {
      case 'mild': return '🌶️';
      case 'medium': return '🌶️🌶️';
      case 'spicy': return '🌶️🌶️🌶️';
      case 'extra_spicy': return '🌶️🌶️🌶️🌶️';
      default: return null;
    }
  };

  const chillies = getChillies(level);
  if (!chillies) return <span className={`text-[10px] uppercase font-bold text-muted-foreground ${className}`}>{level}</span>;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={level}>
      <span className="text-xs leading-none">{chillies}</span>
    </span>
  );
}
