import { useState } from 'react';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card, CardBody } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { useSettlements } from '../../hooks/useSettlements';
import { Coins, Wallet, ArrowRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function AdminSettlementScreen() {
  const { drivers, history, loading, initiateSettlement, refresh } = useSettlements();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [settlementType, setSettlementType] = useState<'cash_collection' | 'earnings_payout'>('cash_collection');
  const [settling, setSettling] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSettle = async () => {
    if (!selectedDriver) return;
    const driver = drivers.find(d => d.id === selectedDriver);
    if (!driver) return;

    const amount = settlementType === 'cash_collection' ? driver.pending_settlement : driver.total_earnings;
    if (amount <= 0) {
      toast.error('No amount to settle');
      return;
    }

    setSettling(true);
    const result = await initiateSettlement(driver.id, settlementType, amount, notes);
    
    if (result.success) {
      toast.success(`${settlementType === 'cash_collection' ? 'Cash Collection' : 'Payout'} initiated. Awaiting driver confirmation.`);
      setSelectedDriver(null);
      setNotes('');
      refresh();
    } else {
      toast.error(result.error || 'Failed to initiate');
    }
    setSettling(false);
  };

  if (loading && drivers.length === 0) {
    return (
      <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="Finance & Settlements" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1400px] mx-auto px-4 py-6 space-y-8"
      >
        <div className="flex items-center justify-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </motion.div>
      </div>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="Settlements" />
      
      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-muted/30 backdrop-blur-sm rounded-[1.5rem] border border-white/50 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'active' ? 'bg-brand-maroon text-white shadow-xl shadow-brand-maroon/20 scale-105' : 'text-muted-foreground hover:bg-white/50'}`}
        >
          ACTIVE BALANCES
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'history' ? 'bg-brand-maroon text-white shadow-xl shadow-brand-maroon/20 scale-105' : 'text-muted-foreground hover:bg-white/50'}`}
        >
          SETTLEMENT HISTORY
        </button>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {activeTab === 'active' ? (
          <>
            {/* Total Pending Overview */}
            <Card className="bg-gradient-to-br from-brand-maroon to-red-900 text-white border-0 shadow-2xl shadow-brand-maroon/20 overflow-hidden relative rounded-[2.5rem]">
               <CardBody className="p-8 relative z-10">
                  <div className="flex items-center justify-between mb-6">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-80">System Cash Exposure</p>
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                        <Wallet className="w-5 h-5" />
                     </div>
                  </div>
                  <h2 className="text-4xl font-black tracking-tighter">
                    ₹{(() => {
                      const totalGross = drivers.reduce((acc, curr) => acc + Math.max(0, curr.pending_settlement), 0);
                      const totalPending = history
                        .filter(s => s.status === 'pending' && s.type === 'cash_collection')
                        .reduce((acc, curr) => acc + curr.amount, 0);
                      return (totalGross - totalPending).toLocaleString();
                    })()}
                  </h2>
                  <p className="text-[9px] mt-3 opacity-60 font-medium uppercase tracking-widest">Aggregate floating cash across all active delivery personnel.</p>
               </CardBody>
               <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            </Card>

            {/* Driver List */}
            <div className="space-y-4">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Delivery Partner Balances</h3>
            <div className="space-y-4 max-w-2xl mx-auto w-full">
                <AnimatePresence mode="popLayout">
                  {drivers.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-muted">
                       <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">No active balances detected</p>
                    </div>
                  ) : (
                    drivers.map((driver, index) => (
                      <motion.div
                        key={driver.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className={`overflow-hidden border-none shadow-xl shadow-black/5 rounded-[2.5rem] transition-all group hover:shadow-2xl hover:shadow-brand-maroon/5 flex flex-col h-full ${selectedDriver === driver.id ? 'ring-2 ring-brand-maroon/20 ring-offset-4' : ''}`}
                          onClick={() => setSelectedDriver(selectedDriver === driver.id ? null : driver.id)}
                        >
                          <CardBody className="p-0">
                            <div className="flex items-stretch min-h-[120px]">
                              {/* Left Bar */}
                              <div className={`w-2 ${driver.pending_settlement > 0 ? 'bg-gradient-to-b from-orange-400 to-amber-600' : 'bg-gradient-to-b from-emerald-400 to-green-600'}`} />
                              
                              <div className="flex-1 p-6 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-maroon/5 flex items-center justify-center font-black text-brand-maroon border border-brand-maroon/10 shadow-inner">
                                      {driver.full_name.charAt(0)}
                                    </div>
                                    <div>
                                      <h4 className="font-black text-sm text-foreground tracking-tight group-hover:text-brand-maroon transition-colors">{driver.full_name}</h4>
                                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em]">
                                        EARNINGS: <span className="text-emerald-600">₹{driver.total_earnings}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1 opacity-60 text-right">IN HAND / EFFECTIVE</p>
                                    <div className="flex flex-col items-end">
                                      <p className="text-2xl font-black text-brand-maroon leading-none">
                                        ₹{driver.cash_collected || 0}
                                      </p>
                                      {/* Calculate effective balance: subtract pending cash collections */}
                                      {(() => {
                                        const pendingCol = history
                                          .filter(s => s.driver_id === driver.id && s.type === 'cash_collection' && s.status === 'pending')
                                          .reduce((sum, s) => sum + s.amount, 0);
                                        
                                        if (pendingCol > 0) {
                                          return (
                                            <p className="text-[10px] font-black text-orange-600 mt-1 uppercase tracking-widest">
                                               (₹{(driver.cash_collected || 0) - pendingCol} EFF.)
                                            </p>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                
                                 {(() => {
                                   const pendingRequests = history.filter(s => s.driver_id === driver.id && s.status === 'pending');
                                   if (pendingRequests.length > 0) {
                                     return (
                                       <div className="pt-4 border-t border-dashed border-border mt-auto flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                           <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                           <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
                                              {pendingRequests.length} SETTLEMENTS PENDING
                                           </span>
                                         </div>
                                         <div className="text-[9px] font-black text-brand-maroon flex items-center gap-2 tracking-widest">
                                           {selectedDriver === driver.id ? 'SELECTED' : 'TAP TO VIEW'} 
                                           <ArrowRight className={`w-3 h-3 ${selectedDriver === driver.id ? 'rotate-90' : ''} transition-transform`} />
                                         </div>
                                       </div>
                                     );
                                   } else if (driver.pending_settlement > 0) {
                                     return (
                                       <div className="pt-4 border-t border-dashed border-border mt-auto flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest">OUTSTANDING: ₹{driver.pending_settlement}</span>
                                         </div>
                                         <div className="text-[9px] font-black text-brand-maroon flex items-center gap-2 tracking-widest">
                                           {selectedDriver === driver.id ? 'SELECTED' : 'TAP TO SETTLE'} 
                                           <ArrowRight className={`w-3 h-3 ${selectedDriver === driver.id ? 'rotate-90' : ''} transition-transform`} />
                                         </div>
                                       </div>
                                     );
                                   }
                                   return null;
                                 })()}
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2">Recent Transactions</h3>
            <div className="space-y-4 max-w-2xl mx-auto w-full">
              <AnimatePresence mode="popLayout">
                {history.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-muted">
                     <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">No history recorded yet</p>
                  </div>
                ) : (
                  history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="shadow-xl shadow-black/5 border-none rounded-[2.5rem] group hover:shadow-2xl transition-all duration-300">
                        <CardBody className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${item.type === 'cash_collection' ? 'bg-brand-maroon/5 text-brand-maroon' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {item.type === 'cash_collection' ? <ArrowRight className="w-5 h-5 -rotate-45" /> : <ArrowRight className="w-5 h-5 rotate-135" />}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5 opacity-60">
                                      {item.type === 'cash_collection' ? 'CASH COLLECTION' : 'EARNINGS PAYOUT'}
                                    </p>
                                    <h4 className="font-black text-sm tracking-tight">
                                      {drivers.find(d => d.id === item.driver_id)?.full_name || 'PARTNER'}
                                    </h4>
                                </div>
                              </div>
                              <div className="text-right">
                                  <p className={`text-xl font-black ${item.type === 'cash_collection' ? 'text-brand-maroon' : 'text-emerald-600'}`}>
                                    ₹{item.amount}
                                  </p>
                                  <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest inline-block mt-1 ${
                                    item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                    item.status === 'pending' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                                    'bg-rose-100 text-rose-700'
                                  }`}>
                                    {item.status}
                                  </span>
                              </div>
                            </div>
                            
                            {item.notes && (
                              <div className="mt-4 p-3 bg-muted/30 rounded-2xl border border-divider">
                                <p className="text-[10px] text-muted-foreground font-bold italic leading-relaxed">{item.notes}</p>
                              </div>
                            )}
                            
                            <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                              <span>TRANS ID: {item.id.slice(0, 8).toUpperCase()}</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Settlement Sheet */}
      <AnimatePresence>
        {selectedDriver && activeTab === 'active' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', scale: 1 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full sm:hidden" />
              
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-brand-maroon">Operational Audit</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                      Partner: <span className="text-foreground">{drivers.find(d => d.id === selectedDriver)?.full_name}</span>
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-brand-maroon/5 rounded-2xl flex items-center justify-center border border-brand-maroon/10">
                    <Coins className="w-7 h-7 text-brand-maroon" />
                  </div>
                </div>

                {/* Settlement Type Toggle */}
                <div className="flex p-1.5 bg-muted/50 rounded-2xl border border-border/50">
                   <button 
                     onClick={() => setSettlementType('cash_collection')}
                     className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${settlementType === 'cash_collection' ? 'bg-brand-maroon text-white shadow-xl shadow-brand-maroon/20 scale-[1.02]' : 'text-muted-foreground hover:bg-white/50'}`}
                   >
                      COLLECT CASH
                   </button>
                   <button 
                     onClick={() => setSettlementType('earnings_payout')}
                     className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${settlementType === 'earnings_payout' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 scale-[1.02]' : 'text-muted-foreground hover:bg-white/50'}`}
                   >
                      PAY PARTNER
                   </button>
                </div>

                <div className="bg-muted/30 p-6 rounded-[2rem] border-2 border-dashed border-border/50">
                   <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                           Current Outstanding Balance
                        </p>
                        <p className={`text-3xl font-black ${settlementType === 'cash_collection' ? 'text-brand-maroon' : 'text-emerald-600'}`}>
                           ₹{settlementType === 'cash_collection' ? drivers.find(d => d.id === selectedDriver)?.pending_settlement : drivers.find(d => d.id === selectedDriver)?.total_earnings}
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl ${settlementType === 'cash_collection' ? 'bg-brand-maroon/10' : 'bg-emerald-50'}`}>
                        {settlementType === 'cash_collection' ? <ArrowRight className="w-6 h-6 text-brand-maroon -rotate-45" /> : <ArrowRight className="w-6 h-6 text-emerald-600 rotate-135" />}
                      </div>
                   </div>
                </div>

                {/* Duplicate Request Guard */}
                {history.some(s => s.driver_id === selectedDriver && s.type === settlementType && s.status === 'pending') && (
                   <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                      <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                      <p className="text-[10px] font-black text-orange-800 uppercase leading-relaxed tracking-widest">Duplicate request detected. Action is pending partner confirmation.</p>
                   </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-2 font-mono">Internal Audit Notes</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-28 bg-muted/50 rounded-2xl p-5 text-sm font-bold border-none focus:ring-4 focus:ring-brand-maroon/5 outline-none transition-all resize-none shadow-inner"
                    placeholder={settlementType === 'cash_collection' ? 'Document cash reconciliation details...' : 'Reference transaction or payout mode...'}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button variant="outline" className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2" onClick={() => setSelectedDriver(null)}>CANCEL</Button>
                  <Button 
                     className={`flex-[2] h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                       settlementType === 'earnings_payout' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                        : 'bg-brand-maroon hover:bg-brand-maroon/90 shadow-brand-maroon/20'
                     }`}
                     onClick={handleSettle}
                     disabled={settling || history.some(s => s.driver_id === selectedDriver && s.type === settlementType && s.status === 'pending')}
                  >
                    {settling ? 'PROCESSING...' : 
                     history.some(s => s.driver_id === selectedDriver && s.type === settlementType && s.status === 'pending') 
                     ? 'REQUEST PENDING' 
                     : settlementType === 'cash_collection' ? 'EXECUTE COLLECTION' : 'EXECUTE PAYOUT'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileContainer>
  );
}
