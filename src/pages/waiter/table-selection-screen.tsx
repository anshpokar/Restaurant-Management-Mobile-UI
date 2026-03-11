import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { supabase, type Profile, getStoredUser } from '@/lib/supabase';
import { useOutletContext } from 'react-router-dom';
import { Chair, Users, Clock, CheckCircle2 } from 'lucide-react';

export function WaiterTableSelectionScreen() {
  const navigate = useNavigate();
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const userId = profile?.id || getStoredUser()?.id;
  
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();

    // Real-time subscription for table status changes
    const subscription = supabase
      .channel('tables')
      .on('postgres_changes' as any, { event: '*', table: 'restaurant_tables' }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);
    // Navigate to customer info screen with table ID
    navigate(`/waiter/customer-info/${tableId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-red-500';
      case 'reserved':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'success';
      case 'occupied':
        return 'error';
      case 'reserved':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Select Table" />

      <div className="px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tables.filter(t => t.status === 'vacant').length}
                </p>
                <p className="text-xs text-muted-foreground">Vacant</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tables.filter(t => t.status === 'occupied').length}
                </p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading tables...</div>
        ) : tables.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed">
            <Chair className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-foreground">No tables found</p>
            <p className="text-xs text-muted-foreground mt-1">Add tables from admin panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => table.status === 'vacant' && handleTableSelect(table.id)}
                disabled={table.status !== 'vacant'}
                className={`relative overflow-hidden rounded-2xl border-2 transition-all active:scale-95 ${
                  table.status === 'vacant'
                    ? 'border-green-500 bg-green-50 hover:border-green-600 cursor-pointer'
                    : 'border-divider bg-muted/50 cursor-not-allowed opacity-60'
                }`}
              >
                <CardBody className="p-4 space-y-3">
                  {/* Status Indicator */}
                  <div className="absolute top-3 right-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(table.status)}`} />
                  </div>

                  {/* Table Icon & Number */}
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      table.status === 'vacant' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      <Chair className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-foreground">Table {table.table_number}</p>
                      <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={getStatusBadgeVariant(table.status)}>
                    {table.status.toUpperCase()}
                  </Badge>

                  {/* Additional Info */}
                  {table.status === 'occupied' && (
                    <div className="pt-2 border-t border-divider">
                      {table.occupied_by_customer_name && (
                        <p className="text-xs text-muted-foreground">
                          {table.occupied_by_customer_name}
                        </p>
                      )}
                      {table.occupied_at && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Since {new Date(table.occupied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </button>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-blue-900">
            💡 Tip: Green tables are available. Tap to select and start taking an order.
          </p>
        </div>
      </div>
    </div>
  );
}
