import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

import { AppHeader } from '../../components/design-system/app-header';
import { Card, CardBody } from '../../components/design-system/card';
import { Button } from '../../components/design-system/button';
import { Badge } from '../../components/design-system/badge';
import { Calendar, Clock, Users, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';

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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      <AppHeader title="Table Reservations" onBack={() => navigate('/admin')} />
      
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-[#6B5353]">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Tables</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-[#F97316]">{stats.reserved}</p>
              <p className="text-xs text-muted-foreground">Reserved</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-[#16A34A]">{stats.available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardBody>
          </Card>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleReleaseAllExpired}
          variant="outline"
          className="w-full gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Release All Expired Reservations
        </Button>

        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          {(['all', 'reserved', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Tables List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredReservations.map((table) => {
              const isActiveReserved = table.is_reserved && table.auto_release_at && new Date(table.auto_release_at) > new Date();
              const isExpired = table.is_reserved && table.auto_release_at && new Date(table.auto_release_at) <= new Date();

              return (
                <Card key={table.id} className="overflow-hidden border-none shadow-md rounded-[2.5rem]">
                  <CardBody className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#F8F2F2] rounded-full flex items-center justify-center">
                          <Users className="w-7 h-7 text-[#6B5353]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#1F2937]">Table #{table.table_number}</h3>
                          <p className="text-sm text-[#9CA3AF]">{table.capacity} guests</p>
                        </div>
                      </div>
                      <Badge variant={isActiveReserved ? 'warning' : 'success'}>
                        {isActiveReserved ? 'RESERVED' : 'AVAILABLE'}
                      </Badge>
                    </div>

                    <div className="h-px bg-[#F3F4F6] w-full mb-6" />

                    {/* Reservation Details */}
                    {isActiveReserved ? (
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>Start Time</span>
                          </div>
                          <p className="font-bold text-[#1F2937] text-lg">
                            {table.reservation_start_time ? table.reservation_start_time.substring(0, 5) : '-'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                            <Clock className="w-4 h-4" />
                            <span>End Time</span>
                          </div>
                          <p className="font-bold text-[#1F2937] text-lg">
                            {table.reservation_end_time ? table.reservation_end_time.substring(0, 5) : '-'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                            <Clock className="w-4 h-4" />
                            <span>Auto-Release</span>
                          </div>
                          <p className="font-medium text-[#9CA3AF] text-lg">
                            {table.auto_release_at ? new Date(table.auto_release_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Status</span>
                          </div>
                          <p className="font-medium text-[#16A34A] text-lg">Active</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 text-[#9CA3AF] text-sm mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isExpired ? 'Reservation expired - table freed' : 'No active reservation'}</span>
                        </div>
                        <p className="text-[#1F2937] font-medium">
                          {isExpired ? 'Auto-released by system' : 'Available for booking'}
                        </p>
                      </div>
                    )}

                    {/* Action Button */}
                    {isActiveReserved && (
                      <button
                        onClick={() => handleReleaseTable(table.id)}
                        className="w-full py-3 rounded-full border border-[#F87171] text-[#EF4444] gap-2 font-bold text-lg flex items-center justify-center hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-6 h-6" />
                        Release Table
                      </button>
                    )}
                  </CardBody>
                </Card>
              );
            })}

            {filteredReservations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tables found with this filter
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
