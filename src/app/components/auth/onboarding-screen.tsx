import React, { useState } from 'react';
import { Button } from '@/app/components/design-system/button';
import { Menu, Calendar, MapPin } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Menu,
    title: 'Browse Menu',
    description: 'Explore our delicious collection of authentic Indian cuisine',
    color: 'bg-primary',
  },
  {
    icon: Calendar,
    title: 'Book Tables Live',
    description: 'Reserve your table instantly and skip the wait',
    color: 'bg-accent',
  },
  {
    icon: MapPin,
    title: 'Track Orders Easily',
    description: 'Real-time updates on your order from kitchen to doorstep',
    color: 'bg-secondary',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8">
        <div className={`flex items-center justify-center w-32 h-32 ${slide.color} rounded-3xl mb-8 shadow-lg`}>
          <Icon className="w-16 h-16 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
          {slide.title}
        </h2>
        <p className="text-center text-muted-foreground text-lg max-w-sm">
          {slide.description}
        </p>
      </div>

      {/* Indicators and Button */}
      <div className="px-8 pb-12">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <Button onClick={handleNext} className="w-full" size="lg">
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
