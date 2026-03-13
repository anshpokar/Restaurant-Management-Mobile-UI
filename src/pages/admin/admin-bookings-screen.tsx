import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search,
  Filter,
  Phone,
  Mail,
  Gift,
  MessageSquare,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase, type TableBooking } from '@/lib/supabase';
import { Input } from '@/components/design-system/input';

export function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'today' | 'upcoming' | 'all'>('all');

  useEffect(() => {
    fetchBookings();
  }, [view]);

  async function fetchBookings() {
    try {
      setLoading(true);
      
      console.log('🔄 Fetching bookings with view:', view);
      
      // Direct query instead of RPC for better reliability
      let query = supabase
        .from('table_bookings')
        .select(`
          *,
          restaurant_tables (
            id,
            table_number,
            capacity,
            status
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters based on view
      if (view === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('booking_date', today);
      } else if (view === 'upcoming') {
        const today = new Date().toISOString().split('T')[0];
        query = query.gt('booking_date', today)
                     .in('status', ['pending', 'confirmed']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        throw error;
      }
      
      console.log('📦 Fetched bookings:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📋 First booking sample:', data[0]);
        console.log('🔑 First booking ID:', data[0].id);
        console.log('🏷️ First booking keys:', Object.keys(data[0]));
      }
      
      // Ensure data has proper structure
      const bookingsData = data || [];
      
      setBookings(bookingsData);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      alert('Failed to fetch bookings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateBooking = async (bookingId: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      console.log('🔍 handleUpdateBooking called with:', { bookingId, newStatus });
      
      // Validate bookingId first
      if (!bookingId || bookingId === 'undefined' || bookingId === 'null') {
        console.error('❌ Invalid booking ID:', bookingId);
        console.error('📋 Type of bookingId:', typeof bookingId);
        alert('Error: Booking ID is missing or invalid. Please refresh the page and try again.');
        return;
      }

      console.log('✅ Booking ID validated:', bookingId);
      
      // First, get the booking details
      const { data: bookingData, error: fetchError } = await supabase
        .from('table_bookings')
        .select('*')
        .eq('id', bookingId)
        .maybeSingle();

      console.log('📦 Fetch result:', { bookingData, fetchError });

      if (fetchError) throw fetchError;
      
      if (!bookingData) {
        console.warn('⚠️ Booking not found:', bookingId);
        alert('Booking not found! It may have been deleted or already processed.');
        fetchBookings();
        return;
      }

      console.log('✅ Found booking:', bookingData);

      // Update booking status
      console.log('📝 Attempting to update booking status...');
      console.log('🏷️ Booking ID:', bookingId);
      console.log('🎯 New Status:', newStatus);
      
      const { data: updateData, error: updateError } = await supabase
        .from('table_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId)
        .select();  // Get updated data back

      console.log('📊 Update result:', { updateData, updateError });

      if (updateError) {
        console.error('❌ Update failed with error:', updateError);
        console.error('❌ Error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      console.log(`✅ Status updated to: ${newStatus}`);
      console.log('✅ Updated booking data:', updateData);

      // If confirming, create a table_session for that date
      if (newStatus === 'confirmed' && bookingData.table_id) {
        console.log('📅 Creating table session...');
        console.log('🏷️ Table ID:', bookingData.table_id);
        
        const { error: sessionError } = await supabase
          .from('table_sessions')
          .insert({
            table_id: bookingData.table_id,
            started_at: new Date(bookingData.booking_date).toISOString(),
            status: 'active',
            payment_status: 'pending',
            total_amount: 0,
          });

        if (sessionError) {
          console.warn('⚠️ Could not create table session:', sessionError.message);
        } else {
          console.log('✅ Table session created successfully');
        }
      } else if (newStatus === 'confirmed' && !bookingData.table_id) {
        console.warn('⚠️ No table_id found in booking data!');
      }

      alert(`Booking ${newStatus} successfully!`);
      fetchBookings();
    } catch (error: any) {
      console.error('❌ Error updating booking:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert('Failed to update booking: ' + (error.message || 'Unknown error'));
    }
  };

  const filteredBookings = bookings.filter(booking => {
    // Apply status filter
    if (filter !== 'all' && booking.status !== filter) return false;
    
    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        booking.customer_name?.toLowerCase().includes(search) ||
        booking.customer_email?.toLowerCase().includes(search) ||
        booking.phone_number?.toLowerCase().includes(search) ||
        booking.restaurant_tables?.table_number.toString().includes(search)
      );
    }
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning"><AlertCircle className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'confirmed':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case 'completed':
        return <Badge variant="info"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    today: bookings.filter(b => b.booking_date === new Date().toISOString().split('T')[0]).length
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-4">
      <AppHeader title="Table Bookings Management" />

      <div className="px-4 py-4 space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card key="total">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
            </CardBody>
          </Card>
          <Card key="pending">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardBody>
          </Card>
          <Card key="confirmed">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </CardBody>
          </Card>
          <Card key="today">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardBody>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          {(['today', 'upcoming', 'all'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-card text-muted-foreground border border-border'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or table number..."
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Bookings List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-2xl"></div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-border">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm font-bold text-foreground">No bookings found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {filter !== 'all' ? `Try changing the filter` : 'No bookings match your search'}
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardBody className="p-0">
                  <div className="flex">
                    {/* Status Color Bar */}
                    <div className={`w-1.5 ${
                      booking.status === 'confirmed' ? 'bg-green-500' :
                      booking.status === 'pending' ? 'bg-yellow-500' :
                      booking.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    
                    <div className="flex-1 p-4">
                      {/* Header with Table Number and Status */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-lg text-foreground">
                              Table #{booking.restaurant_tables?.table_number || '?'}
                            </p>
                            {getStatusBadge(booking.status)}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> 
                            {new Date(booking.booking_date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })} at {booking.booking_time}
                          </p>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div className="space-y-2 mb-3">
                        <p className="font-semibold text-foreground">{booking.customer_name || 'Unknown Customer'}</p>
                        
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {booking.guests_count} Guests
                          </span>
                          {booking.phone_number && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {booking.phone_number}
                            </span>
                          )}
                          {booking.customer_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {booking.customer_email}
                            </span>
                          )}
                        </div>

                        {booking.occasion && (
                          <div className="flex items-center gap-1 text-xs text-primary">
                            <Gift className="w-3 h-3" /> 
                            <span className="capitalize">{booking.occasion.replace('_', ' ')}</span>
                          </div>
                        )}

                        {booking.special_requests && (
                          <div className="flex items-start gap-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" /> 
                            <span>{booking.special_requests}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {booking.status === 'pending' && (
                        <div className="flex gap-2 pt-3 border-t border-divider">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateBooking(booking.id, 'confirmed')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => handleUpdateBooking(booking.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        </div>
                      )}

                      {booking.status === 'confirmed' && (
                        <div className="pt-3 border-t border-divider">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleUpdateBooking(booking.id, 'completed')}
                          >
                            Mark as Completed
                          </Button>
                        </div>
                      )}

                      {/* Footer with Booking Time */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Booked {new Date(booking.created_at!).toLocaleDateString()}
                        </span>
                        {booking.updated_at && (
                          <span>Updated {new Date(booking.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={fetchBookings}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh List
        </Button>
      </div>
    </div>
  );
}
