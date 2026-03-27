import { LayoutGrid, RefreshCw, Armchair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { supabase, type RestaurantTable } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { SessionBillModal } from '@/components/admin/SessionBillModal';
import { Receipt } from 'lucide-react';

interface TableSession {
  id: string;
  table_id: string;
  user_id?: string;
  session_name?: string;
  status: 'active' | 'pending' | 'completed';
  total_amount?: number;
  started_at: string;
}

interface TableWithSession extends RestaurantTable {
  active_session?: TableSession | null;
}

export function AdminTables() {
    const navigate = useNavigate();
    const [tablesWithSessions, setTablesWithSessions] = useState<TableWithSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [selectedSessionForBill, setSelectedSessionForBill] = useState<{id: string, table: number, name: string} | null>(null);

    useEffect(() => {
        fetchData();

        // Real-time subscription for tables and sessions
        const channel = supabase.channel('admin-tables-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dine_in_sessions' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('restaurant_tables')
                .select('*')
                .order('table_number', { ascending: true });

            if (error) throw error;
            // setTables(data || []); // Removed unused state
            await fetchActiveSessions(data || []);
        } catch (error) {
            console.error('Error fetching tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveSessions = async (allTables: RestaurantTable[]) => {
        setSessionsLoading(true);
        try {
            const { data: sessions, error } = await supabase
                .from('dine_in_sessions')
                .select('*')
                .in('session_status', ['active', 'pending'])
                .order('started_at', { ascending: false });

            if (error) throw error;

            const tablesWithSessionsData = allTables.map(table => {
                const session = sessions?.find(s => s.table_id === table.id);
                return {
                    ...table,
                    active_session: session ? {
                        id: session.id,
                        table_id: session.table_id,
                        user_id: session.user_id,
                        session_name: session.session_name,
                        status: session.session_status as 'active' | 'pending' | 'completed',
                        total_amount: session.total_amount,
                        started_at: session.started_at
                    } : null
                };
            });

            setTablesWithSessions(tablesWithSessionsData);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setTablesWithSessions(allTables.map(t => ({ ...t, active_session: null })));
        } finally {
            setSessionsLoading(false);
        }
    };

    const onTableClick = (table: TableWithSession) => {
        if (table.active_session) {
            // Admin can access waiter session management
            navigate(`/waiter/session/${table.active_session.id}`);
        } else {
            // Admin can also start a session (matches waiter functionality)
            navigate(`/waiter/customer-info/${table.id}`);
        }
    };

    return (
        <div className="min-h-screen bg-muted/5 pb-20">
            <AppHeader 
                title="Live Operations" 
                actions={
                    <button 
                      onClick={fetchData} 
                      className="p-2.5 hover:bg-muted rounded-2xl transition-all group"
                      title="Refresh Operations"
                    >
                      <RefreshCw className={`w-5 h-5 text-brand-maroon ${loading || sessionsLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                }
            />

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="px-4 py-6 space-y-8 max-w-[1400px] mx-auto"
            >
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Available', value: tablesWithSessions.filter(t => !t.active_session && t.status === 'available').length, color: 'from-emerald-500 to-green-600' },
                        { label: 'Live Sessions', value: tablesWithSessions.filter(t => t.active_session).length, color: 'from-blue-500 to-indigo-600' },
                        { label: 'Reservations', value: tablesWithSessions.filter(t => t.status === 'reserved').length, color: 'from-amber-500 to-orange-600' }
                    ].map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Card className="border-none overflow-hidden relative group">
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
                            <CardBody className="p-5 text-center space-y-1">
                              <p className="text-3xl font-black text-brand-maroon tracking-tighter">{stat.value}</p>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                            </CardBody>
                          </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 pb-12">
                    <AnimatePresence mode="popLayout">
                        {tablesWithSessions.length === 0 && !loading && !sessionsLoading ? (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-muted"
                            >
                                <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                                <p className="font-black text-foreground uppercase tracking-tight">No floor plan data available</p>
                            </motion.div>
                        ) : (
                            tablesWithSessions.map((table, index) => (
                                <motion.div
                                  key={table.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  transition={{ duration: 0.2, delay: index * 0.03 }}
                                >
                                    <Card
                                        onClick={() => onTableClick(table)}
                                        className={`cursor-pointer overflow-hidden border-none shadow-lg shadow-black/5 rounded-[2.5rem] group hover:shadow-2xl hover:shadow-brand-maroon/5 transition-all duration-300 h-full ${
                                            table.active_session ? 'ring-2 ring-brand-maroon/20 ring-offset-4 ring-offset-muted/5' : ''
                                        }`}
                                    >
                                        <CardBody className="p-6 text-center flex flex-col h-full items-center space-y-4">
                                            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner transition-colors duration-300 ${
                                                table.active_session ? 'bg-brand-maroon text-white' : 
                                                table.status === 'occupied' ? 'bg-red-50 text-red-600' :
                                                table.status === 'reserved' ? 'bg-amber-50 text-amber-600' : 
                                                'bg-muted/50 text-muted-foreground group-hover:bg-brand-maroon/5 group-hover:text-brand-maroon'
                                            }`}>
                                                <Armchair className="w-7 h-7" />
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-black text-foreground tracking-tighter group-hover:text-brand-maroon transition-colors">T{table.table_number}</h3>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{table.capacity} SEATS</p>
                                            </div>
                                            
                                            <div className="w-full mt-auto pt-4 border-t border-dashed border-border/50">
                                                {table.active_session ? (
                                                    <div className="space-y-3">
                                                        <div className="flex justify-center">
                                                            <Badge variant="success" className="bg-emerald-500 text-white border-none px-3 py-1 rounded-full text-[8px] font-black tracking-widest animate-pulse">
                                                                LIVE SESSION
                                                            </Badge>
                                                        </div>
                                                        {table.active_session.session_name && (
                                                            <div className="bg-brand-maroon/5 rounded-2xl p-2.5 space-y-0.5 relative group/info">
                                                                <p className="text-[9px] font-black text-brand-maroon uppercase truncate leading-tight">
                                                                    {table.active_session.session_name}
                                                                </p>
                                                                <p className="text-xs font-black text-brand-maroon">
                                                                    ₹{Math.round(table.active_session.total_amount || 0)}
                                                                </p>
                                                                
                                                                {/* Quick Action Button */}
                                                                <button 
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedSessionForBill({
                                                                        id: table.active_session!.id,
                                                                        table: table.table_number,
                                                                        name: table.active_session!.session_name || 'Guest'
                                                                    });
                                                                  }}
                                                                  className="absolute -right-2 -top-2 w-8 h-8 bg-brand-maroon text-white rounded-full shadow-lg opacity-0 group-hover/info:opacity-100 transition-all flex items-center justify-center hover:scale-110 active:scale-95"
                                                                  title="Generate Receipt"
                                                                >
                                                                  <Receipt className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <Badge 
                                                          variant={table.status === 'occupied' ? 'error' : table.status === 'reserved' ? 'warning' : 'success'} 
                                                          className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0 ${
                                                            table.status === 'available' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-2 border-emerald-400 font-black' : ''
                                                          }`}
                                                        >
                                                            {table.status}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </CardBody>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
            
            {/* Bill Modal */}
            {selectedSessionForBill && (
                <SessionBillModal
                  sessionId={selectedSessionForBill.id}
                  tableNumber={selectedSessionForBill.table}
                  sessionName={selectedSessionForBill.name}
                  onClose={() => setSelectedSessionForBill(null)}
                />
            )}
        </div>
    );
}
