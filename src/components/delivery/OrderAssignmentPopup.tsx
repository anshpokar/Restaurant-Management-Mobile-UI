import React, { useState, useEffect } from 'react';
import { Package, MapPin, Clock, Check, X } from 'lucide-react';
import { Button } from '../design-system/button';
import { Card } from '../design-system/card';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderAssignmentPopupProps {
  order: {
    id: string;
    order_number: string;
    delivery_address: string;
    total_amount: number;
    distance_km?: number;
  };
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onTimeout: (id: string) => void;
}

export function OrderAssignmentPopup({ 
  order, 
  onAccept, 
  onReject, 
  onTimeout 
}: OrderAssignmentPopupProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const totalTime = 30;

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout(order.id);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, order.id, onTimeout]);

  const progress = (timeLeft / totalTime) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed inset-x-4 bottom-24 z-50"
      >
        <Card className="p-0 overflow-hidden shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm">
          {/* Progress Bar Timer */}
          <div className="h-1.5 bg-muted w-full">
            <motion.div 
              className={`h-full ${timeLeft < 10 ? 'bg-destructive' : 'bg-primary'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">New Delivery Available</h3>
                  <p className="text-sm text-muted-foreground font-medium">#{order.order_number}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-foreground">₹{order.total_amount}</span>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Earnings</p>
              </div>
            </div>

            <div className="space-y-3 bg-muted/30 p-3 rounded-xl border border-divider">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Delivery Location</p>
                  <p className="text-sm font-medium line-clamp-2">{order.delivery_address}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 border-destructive/20 text-destructive hover:bg-destructive/10"
                onClick={() => onReject(order.id)}
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </Button>
              <Button 
                variant="primary" 
                className="flex-2 h-12 relative overflow-hidden"
                onClick={() => onAccept(order.id)}
              >
                <Check className="w-5 h-5 mr-2" />
                Accept ({timeLeft}s)
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
