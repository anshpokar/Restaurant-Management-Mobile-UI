import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { useSettlements } from '@/hooks/useSettlements';
import { Profile } from '@/lib/supabase';
import { Clock, ArrowDownCircle, ArrowUpCircle, History, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function DeliverySettlementsScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const { history, confirmSettlement } = useSettlements();
  const [processing, setProcessing] = useState<string | null>(null);

  const pending = history.filter(s => s.driver_id === profile?.id && s.status === 'pending');
  const past = history.filter(s => s.driver_id === profile?.id && s.status !== 'pending');

  const handleConfirm = async (id: string) => {
    setProcessing(id);
    const result = await confirmSettlement(id);
    if (result.success) {
      toast.success('Settlement confirmed successfully');
    } else {
      toast.error(result.error || 'Failed to confirm');
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-6 pb-24 px-1">
      {/* Pending Section */}
      <section className="space-y-3">
        <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
           <AlertCircle className="w-4 h-4" /> Pending Action
        </h3>
        {pending.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">No settlements awaiting confirmation.</p>
        ) : (
          pending.map(s => (
            <Card key={s.id} className="border-2 border-primary/20 bg-primary/5 shadow-lg">
               <CardBody className="p-5">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                           {s.type === 'cash_collection' ? 'Cash Hand-over' : 'Earnings Payout'}
                        </p>
                        <h4 className="text-2xl font-black text-foreground">₹{s.amount}</h4>
                     </div>
                     <Clock className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                  
                  <div className="bg-white/50 rounded-xl p-3 mb-4 text-xs text-muted-foreground border border-primary/5">
                     <p className="font-bold text-foreground mb-1">Manager's Note:</p>
                     {s.notes || 'No notes provided.'}
                  </div>

                  <div className="flex gap-3">
                     <Button 
                       className="flex-1 rounded-xl font-black h-12"
                       onClick={() => handleConfirm(s.id)}
                       disabled={!!processing}
                     >
                        {processing === s.id ? 'Confirming...' : 'Confirm Received'}
                     </Button>
                  </div>
               </CardBody>
            </Card>
          ))
        )}
      </section>

      {/* History Section */}
      <section className="space-y-3">
        <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
           <History className="w-4 h-4" /> Settlement History
        </h3>
        <div className="space-y-3">
          {past.length === 0 ? (
            <div className="text-center py-10 bg-muted/10 rounded-3xl border-2 border-dashed border-divider">
               <p className="text-sm text-muted-foreground font-medium">No history found</p>
            </div>
          ) : (
            past.map(s => (
              <Card key={s.id} className="border-divider shadow-sm">
                 <CardBody className="p-4">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.type === 'cash_collection' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                             {s.type === 'cash_collection' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                                {s.type === 'cash_collection' ? 'Cash Collection' : 'Earnings Payout'}
                             </p>
                             <p className="text-base font-black">₹{s.amount}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${s.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {s.status}
                          </span>
                          <p className="text-[9px] text-muted-foreground mt-1">
                             {new Date(s.created_at).toLocaleDateString()}
                          </p>
                       </div>
                    </div>
                 </CardBody>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
