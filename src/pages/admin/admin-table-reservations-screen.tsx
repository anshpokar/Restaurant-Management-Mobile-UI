import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

import { motion, AnimatePresence } from 'motion/react';
import { AppHeader } from '../../components/design-system/app-header';
import { Card, CardBody } from '../../components/design-system/card';
import { Badge } from '../../components/design-system/badge';
import { Users, CheckCircle2, Trash2, RefreshCw, Loader2, Table } from 'lucide-react';

interface TableReservation {
  id: string;
  table_number: number;
  is_reserved: boolean;
  reservation_start_time: string | null;
  reservation_end_time: string | null;
  auto_release_at: string | null;
  status: string;
  capacity: number;
}

export function AdminTableReservationsScreen() {
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reserved' | 'available'>('all');

  useEffect(() => {
    fetchReservations();

    // Real-time subscription for table updates
    const channel = supabase.channel('admin-reservations-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        fetchReservations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      setReservations(data || []);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load table reservations');
    } finally {

      setLoading(false);
    }
  };

  const handleReleaseTable = async (tableId: string) => {
    if (!window.confirm('Release this table? This will make it available immediately.')) return;


    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({
          is_reserved: false,
          reservation_start_time: null,
          reservation_end_time: null,
          auto_release_at: null,
          status: 'available'
        })
        .eq('id', tableId);

      if (error) throw error;
      
      toast.success('Table released successfully!');
      fetchReservations();
    } catch (error: any) {
      console.error('Error releasing table:', error);
      toast.error('Failed to release table');
    }

  };

  const handleReleaseAllExpired = async () => {
    try {
      const { data, error } = await supabase.rpc('release_expired_table_reservations');
      
      if (error) throw error;
      
      const count = typeof data === 'number' ? data : 0;
      toast.success(`Released ${count} expired reservation(s)!`);
      fetchReservations();
    } catch (error: any) {
      console.error('Error releasing expired:', error);
      toast.error('Failed to release expired reservations');
    }

  };

  const filteredReservations = reservations.filter(table => {
    if (filter === 'reserved') return table.is_reserved && table.auto_release_at && new Date(table.auto_release_at) > new Date();
    if (filter === 'available') return !table.is_reserved || (table.auto_release_at && new Date(table.auto_release_at) <= new Date());
    return true;
  });

  const stats = {
    total: reservations.length,
    reserved: reservations.filter(t => t.is_reserved && t.auto_release_at && new Date(t.auto_release_at) > new Date()).length,
    available: reservations.filter(t => !t.is_reserved || (t.auto_release_at && new Date(t.auto_release_at) <= new Date())).length
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="Reservation Terminal" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-6 space-y-8 max-w-[1200px] mx-auto"
      >
        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Inventory', value: stats.total, icon: <Table className="w-4 h-4" />, color: 'from-slate-700 to-slate-900' },
            { label: 'Engaged', value: stats.reserved, icon: <Users className="w-4 h-4" />, color: 'from-brand-maroon to-red-900' },
            { label: 'Available', value: stats.available, icon: <CheckCircle2 className="w-4 h-4" />, color: 'from-emerald-500 to-teal-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`border-none shadow-xl bg-gradient-to-br ${stat.color} text-white rounded-3xl overflow-hidden relative group`}>
                <CardBody className="p-4 relative z-10 text-center">
                  <span className="text-2xl font-black tracking-tighter block mb-1">{stat.value}</span>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">{stat.label}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Global Action */}
        <button
          onClick={handleReleaseAllExpired}
          className="w-full h-16 bg-white rounded-[2rem] shadow-xl shadow-black/5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-brand-maroon border-2 border-transparent hover:border-brand-maroon/20 transition-all active:scale-95 group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Purge Expired Protocol
        </button>

        {/* Filter Navigation */}
        <div className="flex gap-2 p-2 bg-white rounded-[2.5rem] shadow-xl shadow-black/5">
          {(['all', 'reserved', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-4 rounded-[2rem] text-[9px] font-black uppercase tracking_widest transition-all ${
                filter === f 
                  ? 'bg-brand-maroon text-white shadow-lg shadow-brand-maroon/20' 
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {f === 'all' ? 'SYNC ALL' : f === 'reserved' ? 'ENGAGED' : 'READY'}
            </button>
          ))}
        </div>

        {/* Tables Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {loading && reservations.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-brand-maroon/20 mb-4" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Syncing Reservation Uplink...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-muted shadow-inner"
              >
                <Table className="w-16 h-16 text-muted/30 mx-auto mb-6" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-muted-foreground">Empty Matrix</h3>
              </motion.div>
            ) : (
              filteredReservations.map((table, index) => {
                const isActiveReserved = table.is_reserved && table.auto_release_at && new Date(table.auto_release_at) > new Date();
                const isExpired = table.is_reserved && table.auto_release_at && new Date(table.auto_release_at) <= new Date();

                return (
                  <motion.div
                    key={table.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="shadow-xl shadow-black/5 border-none rounded-[3rem] group hover:shadow-2xl hover:shadow-brand-maroon/5 overflow-hidden transition-all duration-300">
                      <CardBody className="p-8">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border transition-colors ${
                              isActiveReserved ? 'bg-brand-maroon/5 border-brand-maroon/10 text-brand-maroon' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                              <Users className="w-7 h-7" />
                            </div>
                            <div>
                              <h3 className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors text-lg">Table #{table.table_number}</h3>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">{table.capacity} PASSENGERS</p>
                            </div>
                          </div>
                          <Badge variant={isActiveReserved ? 'warning' : 'success'} className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0">
                            {isActiveReserved ? 'ENGAGED' : 'READY'}
                          </Badge>
                        </div>

                        <div className="space-y-4 mb-8">
                          {isActiveReserved ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 bg-muted/30 rounded-3xl border border-dashed border-border/50">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Docked</p>
                                <p className="font-black text-foreground tracking-tighter">
                                  {table.reservation_start_time?.substring(0, 5)}
                                </p>
                              </div>
                              <div className="p-4 bg-muted/30 rounded-3xl border border-dashed border-border/50">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Departure</p>
                                <p className="font-black text-foreground tracking-tighter">
                                  {table.reservation_end_time?.substring(0, 5)}
                                </p>
                              </div>
                              <div className="col-span-2 p-4 bg-brand-maroon/[0.03] rounded-3xl border border-brand-maroon/10">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-black text-brand-maroon uppercase tracking-widest">Protocol Release</span>
                                  <span className="text-[10px] font-black text-brand-maroon">
                                    {table.auto_release_at ? new Date(table.auto_release_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-6 px-4 bg-emerald-50/30 rounded-[2rem] border border-dashed border-emerald-200 text-center">
                              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-3" />
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-4">
                                {isExpired ? 'SIGNAL EXPIRED • SYSTEM RECLAIMED' : 'CLEAR FOR IMMEDIATE BOARDING'}
                              </p>
                            </div>
                          )}
                        </div>

                        {isActiveReserved && (
                          <button
                            onClick={() => handleReleaseTable(table.id)}
                            className="w-full h-16 rounded-[2rem] bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-rose-100 transition-all active:scale-95 group/btn"
                          >
                            <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            Abort Reservation
                          </button>
                        )}
                      </CardBody>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
