import { LayoutGrid, Users, RefreshCw } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { supabase, type RestaurantTable } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';

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

    useEffect(() => {
        fetchData();
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
        <div className="min-h-screen bg-background pb-20 overflow-y-auto">
            <AppHeader 
                title="Table Management" 
                actions={
                    <Button variant="outline" size="sm" onClick={fetchData} isLoading={loading || sessionsLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${(loading || sessionsLoading) ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                }
            />

            <div className="p-4 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="border-none shadow-sm bg-green-50">
                        <CardBody className="p-3 text-center">
                            <p className="text-2xl font-black text-green-600">
                                {tablesWithSessions.filter(t => !t.active_session && t.status === 'available').length}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Available</p>
                        </CardBody>
                    </Card>
                    <Card className="border-none shadow-sm bg-blue-50">
                        <CardBody className="p-3 text-center">
                            <p className="text-2xl font-black text-blue-600">
                                {tablesWithSessions.filter(t => t.active_session).length}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Active</p>
                        </CardBody>
                    </Card>
                    <Card className="border-none shadow-sm bg-orange-50">
                        <CardBody className="p-3 text-center">
                            <p className="text-2xl font-black text-orange-600">
                                {tablesWithSessions.filter(t => t.status === 'reserved').length}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Reserved</p>
                        </CardBody>
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {tablesWithSessions.length === 0 && !loading && !sessionsLoading ? (
                        <div className="col-span-full py-20 text-center bg-card rounded-3xl border-2 border-dashed border-divider">
                            <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                            <p className="font-bold text-muted-foreground">No tables found</p>
                        </div>
                    ) : (
                        tablesWithSessions.map(table => (
                            <Card
                                key={table.id}
                                onClick={() => onTableClick(table)}
                                className={`cursor-pointer transition-all active:scale-95 border-2 ${
                                    table.active_session
                                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400'
                                        : table.status === 'occupied'
                                            ? 'bg-red-50 border-red-200 hover:border-red-300'
                                            : table.status === 'reserved'
                                                ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                                                : 'bg-green-50 border-green-200 hover:border-primary'
                                }`}
                            >
                                <CardBody className="p-3 text-center flex flex-col h-full justify-between gap-2">
                                    <div>
                                        <div className="text-2xl mb-1">
                                            {table.active_session ? '👨‍👩‍👧‍👦' : table.status === 'occupied' ? '⚠️' : '🍽️'}
                                        </div>
                                        <h3 className="text-base font-black text-foreground">T{table.table_number}</h3>
                                        <p className="text-[10px] font-medium text-muted-foreground">{table.capacity} Seats</p>
                                    </div>
                                    
                                    {table.active_session ? (
                                        <div className="space-y-1.5">
                                            <div className="w-fit mx-auto">
                                                <Badge variant="paid" size="sm">
                                                    <Users className="w-2 h-2 mr-0.5 inline" />
                                                    ACTIVE
                                                </Badge>
                                            </div>
                                            {table.active_session.session_name && (
                                                <div className="bg-white/80 rounded-md p-1.5">
                                                    <p className="text-[9px] font-bold text-primary truncate leading-tight">
                                                        {table.active_session.session_name}
                                                    </p>
                                                    <p className="text-[9px] font-semibold text-muted-foreground">
                                                        ₹{Math.round(table.active_session.total_amount || 0)}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-fit mx-auto">
                                            <Badge variant={table.status === 'occupied' ? 'occupied' : table.status === 'reserved' ? 'warning' : 'success'} size="sm">
                                                {table.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
