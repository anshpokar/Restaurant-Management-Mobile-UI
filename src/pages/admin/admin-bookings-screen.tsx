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
  Phone,
  Mail,
  Gift,
  MessageSquare,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase, type TableBooking } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';


export function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'today' | 'upcoming' | 'all'>('all');

  useEffect(() => {
    fetchBookings();

    // Real-time subscription for booking updates
    const channel = supabase.channel('admin-bookings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      
      setBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings: ' + error.message);
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
        toast.error('Error: Booking ID is missing or invalid. Please refresh the page and try again.');
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
        toast.warning('Booking not found! It may have been deleted or already processed.');
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

      // If confirming, create a dine_in_session
      if (newStatus === 'confirmed' && bookingData.table_id) {
        console.log('📅 Creating dine-in session...');
        console.log('🏷️ Table ID:', bookingData.table_id);
        
        // Calculate session name
        const sessionName = `${bookingData.customer_name || 'Booking'}'s Table`;
        
        // Insert into dine_in_sessions (Primary session table)
        const { data: sessionData, error: sessionError } = await supabase
          .from('dine_in_sessions')
          .insert({
            table_id: bookingData.table_id,
            user_id: bookingData.user_id || null,
            session_name: sessionName,
            session_status: 'active',
            payment_status: 'pending',
            total_amount: 0,
            paid_amount: 0,
            notes: `Confirmed booking from Admin for ${bookingData.booking_date} at ${bookingData.booking_time}`
          })
          .select('id')
          .single();

        if (sessionError) {
          console.error('❌ Failed to create dine-in session:', sessionError.message);
          toast.error(`Booking confirmed but could not create active session: ${sessionError.message}`);

        } else {
          console.log('✅ Dine-in session created successfully!');
          let createdSessionId = sessionData?.id;
          
          // Also update table status
          await supabase
            .from('restaurant_tables')
            .update({ 
              status: 'reserved',
              current_session_id: createdSessionId 
            })
            .eq('id', bookingData.table_id);

          toast.success(`Booking confirmed and active session created!`);
        }

      } else if (newStatus === 'confirmed' && !bookingData.table_id) {
        console.warn('⚠️ No table_id found in booking data!');
        toast.error('Cannot confirm booking: No table assigned!');
        return;
      }

      toast.success(`Booking ${newStatus} successfully!`);

      fetchBookings();
    } catch (error: any) {
      console.error('❌ Error updating booking:', error);
      toast.error('Failed to update booking: ' + (error.message || 'Unknown error'));
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
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader
        title="Reservations Manager"
        actions={
          <button 
            onClick={fetchBookings} 
            className="p-2.5 hover:bg-muted rounded-2xl transition-all group"
            title="Refresh Bookings"
          >
            <RefreshCw className={`w-5 h-5 text-brand-maroon ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        }
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-6 space-y-8 max-w-[1400px] mx-auto"
      >
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: stats.total, color: 'from-brand-maroon to-red-900', icon: Calendar },
            { label: 'Pending Requests', value: stats.pending, color: 'from-amber-500 to-orange-600', icon: AlertCircle },
            { label: 'Confirmed Today', value: stats.today, color: 'from-emerald-500 to-green-600', icon: CheckCircle2 },
            { label: 'Active Guests', value: stats.confirmed, color: 'from-blue-500 to-indigo-600', icon: Users },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-none overflow-hidden relative group h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10 group-hover:opacity-15 transition-opacity`} />
                <CardBody className="p-5 flex flex-col items-center justify-center space-y-2">
                  <stat.icon className="w-5 h-5 text-brand-maroon/40" />
                  <p className="text-3xl font-black text-brand-maroon tracking-tighter">{stat.value}</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-3 p-1.5 bg-muted/30 backdrop-blur-sm rounded-[1.5rem] border border-white/50 max-w-md mx-auto">
          {(['today', 'upcoming', 'all'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all capitalize ${
                view === v 
                  ? 'bg-brand-maroon text-white shadow-xl shadow-brand-maroon/20 scale-105' 
                  : 'text-muted-foreground hover:bg-white/50'
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
          {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap transition-all border-2 tracking-widest ${
                filter === status
                  ? 'bg-white border-brand-maroon text-brand-maroon shadow-lg shadow-brand-maroon/5 ring-4 ring-brand-maroon/5'
                  : 'bg-white border-transparent text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative group max-w-2xl mx-auto w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-maroon transition-colors" />
          <input
            type="text"
            placeholder="Search by customer, table, or contact details..."
            className="w-full pl-12 pr-6 py-4 bg-white border-none shadow-sm rounded-3xl text-sm font-bold focus:ring-4 focus:ring-brand-maroon/5 outline-none transition-all placeholder:text-muted-foreground/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Bookings List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-muted rounded-[2.5rem]"></div>
                ))}
              </div>
            ) : filteredBookings.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-muted"
              >
                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-lg font-black text-foreground uppercase tracking-tight">No Reservatons Found</p>
                <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-widest">
                  Try adjusting your filters or search query
                </p>
              </motion.div>
            ) : (
              filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden border-none shadow-xl shadow-black/5 rounded-[2.5rem] group hover:shadow-2xl transition-all duration-300">
                    <CardBody className="p-0">
                      <div className="flex items-stretch h-full">
                        {/* Status Color Bar */}
                        <div className={`w-3 shrink-0 ${
                          booking.status === 'confirmed' ? 'bg-gradient-to-b from-emerald-400 to-green-600' :
                          booking.status === 'pending' ? 'bg-gradient-to-b from-amber-400 to-orange-600' :
                          booking.status === 'cancelled' ? 'bg-gradient-to-b from-red-400 to-rose-600' : 
                          'bg-gradient-to-b from-blue-400 to-indigo-600'
                        }`} />
                        
                        <div className="flex-1 p-6 space-y-5">
                          {/* Header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="bg-brand-maroon/5 p-2 rounded-xl border border-brand-maroon/10">
                                  <p className="font-black text-lg text-brand-maroon leading-none">
                                    TBL #{booking.restaurant_tables?.table_number || '?'}
                                  </p>
                                </div>
                                <div className="scale-90 origin-left">
                                  {getStatusBadge(booking.status)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-brand-maroon" /> 
                                  {new Date(booking.booking_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-brand-maroon" /> 
                                  {booking.booking_time}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Customer Details */}
                          <div className="bg-muted/30 p-4 rounded-3xl border border-border group-hover:border-brand-maroon/20 transition-colors">
                            <h4 className="font-black text-base text-foreground mb-3">{booking.customer_name || 'VIP Guest'}</h4>
                            
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                  <Users className="w-3.5 h-3.5 text-brand-maroon" />
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground">{booking.guests_count} GUESTS</p>
                              </div>
                              {booking.phone_number && (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                    <Phone className="w-3.5 h-3.5 text-brand-maroon" />
                                  </div>
                                  <p className="text-[10px] font-black text-muted-foreground truncate">{booking.phone_number}</p>
                                </div>
                              )}
                              {booking.customer_email && (
                                <div className="flex items-center gap-2 col-span-2">
                                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                                    <Mail className="w-3.5 h-3.5 text-brand-maroon" />
                                  </div>
                                  <p className="text-[10px] font-black text-muted-foreground truncate">{booking.customer_email}</p>
                                </div>
                              )}
                            </div>

                            {(booking.occasion || booking.special_requests) && (
                              <div className="mt-4 pt-4 border-t border-dashed border-muted-foreground/20 space-y-2">
                                {booking.occasion && (
                                  <div className="flex items-center gap-2">
                                    <Gift className="w-3.5 h-3.5 text-brand-maroon" /> 
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-maroon">{booking.occasion.replace('_', ' ')}</span>
                                  </div>
                                )}
                                {booking.special_requests && (
                                  <div className="flex items-start gap-2 bg-white/50 p-2.5 rounded-2xl">
                                    <MessageSquare className="w-3.5 h-3.5 text-brand-maroon shrink-0 mt-0.5" /> 
                                    <span className="text-[10px] font-bold text-muted-foreground italic leading-relaxed">{booking.special_requests}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-2">
                            {booking.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 font-black h-12 text-[10px] tracking-widest"
                                  onClick={() => handleUpdateBooking(booking.id, 'confirmed')}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" /> CONFIRM
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 rounded-2xl border-2 border-red-100 text-red-500 hover:bg-red-50 font-black h-12 text-[10px] tracking-widest"
                                  onClick={() => handleUpdateBooking(booking.id, 'cancelled')}
                                >
                                  <XCircle className="w-4 h-4 mr-2" /> REJECT
                                </Button>
                              </>
                            )}

                            {booking.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full rounded-2xl border-2 border-brand-maroon/20 text-brand-maroon hover:bg-brand-maroon/5 font-black h-12 text-[10px] tracking-widest"
                                onClick={() => handleUpdateBooking(booking.id, 'completed')}
                              >
                                MARK AS ARRIVED & COMPLETED
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
