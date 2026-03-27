import { useState } from 'react';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card, CardBody } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { useSettlements } from '../../hooks/useSettlements';
import { Coins, Wallet, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function AdminSettlementScreen() {
  const { drivers, loading, settleAmount, refresh } = useSettlements();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSettle = async () => {
    if (!selectedDriver) return;
    const driver = drivers.find(d => d.id === selectedDriver);
    if (!driver) return;

    setSettling(true);
    const result = await settleAmount(driver.id, driver.pending_settlement, notes);
    
    if (result.success) {
      toast.success(`Settled ₹${driver.pending_settlement} with ${driver.full_name}`);
      setSelectedDriver(null);
      setNotes('');
      refresh();
    } else {
      toast.error(result.error || 'Failed to settle');
    }
    setSettling(false);
  };

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="Settlements" />
        <div className="flex items-center justify-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="Driver Settlements" />
      
      <div className="p-4 space-y-6 pb-24">
        {/* Total Pending Overview */}
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0 shadow-lg overflow-hidden relative">
           <CardBody className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-xs font-black uppercase tracking-widest opacity-80">Total Pending Cash</p>
                 <Wallet className="w-5 h-5 opacity-50" />
              </div>
              <h2 className="text-3xl font-black">
                ₹{drivers.reduce((acc, curr) => acc + Math.max(0, curr.pending_settlement), 0).toLocaleString()}
              </h2>
              <p className="text-[10px] mt-2 opacity-70">Total cash collected by all drivers minus their earnings.</p>
           </CardBody>
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        </Card>

        {/* Driver List */}
        <div className="space-y-3">
          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground px-1">Active Delivery Partners</h3>
          {drivers.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2">
               <p className="text-sm text-muted-foreground">No drivers found</p>
            </Card>
          ) : (
            drivers.map((driver) => (
              <Card 
                key={driver.id} 
                className={`overflow-hidden border-2 transition-all ${selectedDriver === driver.id ? 'border-primary shadow-md scale-[1.02]' : 'border-divider shadow-sm hover:border-muted-foreground/30'}`}
                onClick={() => setSelectedDriver(selectedDriver === driver.id ? null : driver.id)}
              >
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-black text-muted-foreground">
                        {driver.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-sm">{driver.full_name}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Earnings: ₹{driver.total_earnings}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Collected</p>
                      <p className={`text-lg font-black ${driver.pending_settlement > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        ₹{driver.cash_collected || 0}
                      </p>
                    </div>
                  </div>
                  
                  {driver.pending_settlement > 0 && (
                    <div className="mt-3 pt-3 border-t border-divider flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                        <span className="text-[10px] font-bold text-orange-700 uppercase">Pending: ₹{driver.pending_settlement}</span>
                      </div>
                      {selectedDriver !== driver.id && (
                        <div className="text-[10px] font-black text-primary flex items-center gap-1">
                          TAP TO SETTLE <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Settlement Sheet */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 z-[100] bg-background border-t border-divider rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6"
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">Settle Account</h3>
                  <p className="text-sm text-muted-foreground tracking-tight">
                    Confirm cash received from <span className="text-foreground font-bold">{drivers.find(d => d.id === selectedDriver)?.full_name}</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-2xl">
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Driver Earnings</p>
                   <p className="text-xl font-black text-foreground">₹{drivers.find(d => d.id === selectedDriver)?.total_earnings}</p>
                </div>
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Cash to Collect</p>
                   <p className="text-xl font-black text-primary">₹{drivers.find(d => d.id === selectedDriver)?.pending_settlement}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">Settlement Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-24 bg-muted/50 rounded-2xl p-4 text-sm font-medium border-0 focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="e.g. Cash received by Manager, full settlement..."
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => setSelectedDriver(null)}>Cancel</Button>
                <Button 
                  className="flex-2 h-14 rounded-2xl font-black text-sm uppercase tracking-widest"
                  onClick={handleSettle}
                  disabled={settling}
                >
                  {settling ? 'Settling...' : 'Confirm Settlement'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileContainer>
  );
}
