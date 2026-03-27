import { LayoutGrid, Users } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { RestaurantTable, type Profile } from '@/lib/supabase';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

export function WaiterDashboard() {
    const navigate = useNavigate();
    const { tables, loading, fetchTables } = useOutletContext<{
        tables: RestaurantTable[],
        loading: boolean,
        fetchTables: () => void,
        profile: Profile | null
    }>();

    const [tablesWithSessions, setTablesWithSessions] = useState<TableWithSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    useEffect(() => {
        if (tables.length > 0) {
            fetchActiveSessions();
        }

        // Real-time subscription for session and table changes
        const sessionsChannel = supabase.channel('waiter-sessions-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dine_in_sessions' }, () => {
                fetchActiveSessions();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
                fetchTables(); // This will trigger the effect again and then fetchActiveSessions
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sessionsChannel);
        };
    }, [tables]);

    const fetchActiveSessions = async () => {
        setSessionsLoading(true);
        try {
            // Fetch all active dine-in sessions with table details
            const { data: sessions, error } = await supabase
                .from('dine_in_sessions')
                .select('*')
                .in('session_status', ['active', 'pending'])
                .order('started_at', { ascending: false });

            if (error) throw error;

            // Map sessions to tables
            const tablesWithSessionsData = tables.map(table => {
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
            // Fallback to tables without sessions
            setTablesWithSessions(tables.map(t => ({ ...t, active_session: null })));
        } finally {
            setSessionsLoading(false);
        }
    };

    const onTableClick = (table: TableWithSession) => {
        if (table.active_session) {
            // If session exists, go to session management
            navigate(`/waiter/session/${table.active_session.id}`);
        } else {
            // If no session, go to customer selection to start session
            navigate(`/waiter/customer-info/${table.id}`);
        }
    };

    return (
        <div className="p-4 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-foreground">Table Management</h2>
                    <p className="text-sm text-muted-foreground">Select a table to start an order</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTables} isLoading={loading}>
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {tablesWithSessions.length === 0 && !loading && !sessionsLoading ? (
                    <div className="col-span-full py-20 text-center bg-card rounded-3xl border-2 border-dashed border-divider">
                        <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                        <p className="font-bold text-muted-foreground">No tables found in database</p>
                        <p className="text-xs text-muted-foreground mt-1">Please add tables in the Admin section</p>
                    </div>
                ) : (
                    tablesWithSessions.map(table => (
                        <Card
                            key={table.id}
                            onClick={() => onTableClick(table)}
                            className={`cursor-pointer transition-all active:scale-95 border-2 ${table.active_session
                                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400'
                                    : table.status === 'occupied'
                                        ? 'bg-red-50 border-red-200 hover:border-red-300'
                                        : table.status === 'reserved'
                                            ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                                            : 'bg-green-50 border-green-200 hover:border-primary'
                                }`}
                        >
                            <CardBody className="p-3 text-center flex flex-col h-full justify-between gap-2">
                                {/* Table Info */}
                                <div>
                                    <div className="text-2xl mb-1">
                                        {table.active_session ? '👨‍👩‍👧‍👦' : table.status === 'occupied' ? '⚠️' : '🍽️'}
                                    </div>
                                    <h3 className="text-base font-black text-foreground">T{table.table_number}</h3>
                                    <p className="text-[10px] font-medium text-muted-foreground">{table.capacity} Seats</p>
                                </div>

                                {/* Session Status */}
                                {table.active_session ? (
                                    <div className="space-y-1.5">
                                        <div className="w-fit">
                                            <Badge variant="paid">
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
                                    <div className="w-fit">
                                        <Badge variant={table.status === 'occupied' ? 'occupied' : table.status === 'reserved' ? 'warning' : 'success'}>
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
    );
}
