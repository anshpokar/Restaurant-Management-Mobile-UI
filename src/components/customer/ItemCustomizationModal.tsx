import { useState } from 'react';
import { X } from 'lucide-react';

interface ItemCustomizationModalProps {
  isOpen: boolean;
  itemName: string;
  onClose: () => void;
  onConfirm: (specialInstructions: string, spiceLevel: SpiceLevel) => void;
}

type SpiceLevel = 'mild' | 'medium' | 'spicy' | 'extra_spicy';

const SPICE_OPTIONS: { value: SpiceLevel; label: string; icon: string; color: string }[] = [
  { value: 'mild', label: 'Mild', icon: '🌶️', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', icon: '🌶️🌶️', color: 'bg-yellow-500' },
  { value: 'spicy', label: 'Spicy', icon: '🌶️🌶️🌶️', color: 'bg-orange-500' },
  { value: 'extra_spicy', label: 'Extra Spicy', icon: '🌶️🌶️🌶️🌶️', color: 'bg-red-600' },
];

export function ItemCustomizationModal({
  isOpen,
  itemName,
  onClose,
  onConfirm,
}: ItemCustomizationModalProps) {
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState<SpiceLevel>('medium');
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(specialInstructions, selectedSpiceLevel);
    // Reset state
    setSpecialInstructions('');
    setSelectedSpiceLevel('medium');
  };

  const handleCancel = () => {
    setSpecialInstructions('');
    setSelectedSpiceLevel('medium');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-foreground">Customize Your Order</h3>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Item Name */}
          <div className="bg-primary/5 rounded-xl p-3">
            <p className="text-sm font-medium text-primary">Adding to cart:</p>
            <p className="text-base font-bold text-foreground mt-1">{itemName}</p>
          </div>

          {/* Spice Level Selection */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-3">
              🌶️ Select Spice Level
            </label>
            <div className="space-y-2">
              {SPICE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedSpiceLevel(option.value)}
                  className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    selectedSpiceLevel === option.value
                      ? `border-${option.color.replace('bg-', '')} bg-${option.color.replace('bg-', '')}/10`
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="flex-1 text-left font-medium">{option.label}</span>
                  {selectedSpiceLevel === option.value && (
                    <div className={`w-5 h-5 rounded-full ${option.color}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              📝 Special Instructions (Optional)
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., No onions, extra cheese, less oil..."
              className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                Mention any allergies or dietary restrictions
              </p>
              <p className="text-xs text-muted-foreground">
                {specialInstructions.length}/200
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={handleConfirm}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 active:scale-95 transition-all"
          >
            Add to Cart
          </button>
          <button
            onClick={handleCancel}
            className="w-full h-12 bg-transparent border-2 border-border text-foreground rounded-xl font-bold hover:bg-muted active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
