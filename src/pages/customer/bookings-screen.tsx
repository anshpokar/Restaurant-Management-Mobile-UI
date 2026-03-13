import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Calendar, Users, Clock, CheckCircle2, XCircle, Phone, Gift, MessageSquare } from 'lucide-react';
import { supabase, type RestaurantTable, type TableBooking } from '@/lib/supabase';
import { Badge } from '@/components/design-system/badge';

export function BookingsScreen({ hideHeader = false }: { hideHeader?: boolean }) {
  const [view, setView] = useState<'book' | 'my-bookings'>('book');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [myBookings, setMyBookings] = useState<TableBooking[]>([]);

  // Helper function to calculate end time
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [guests, setGuests] = useState(2);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // Enhanced fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [occasion, setOccasion] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [duration, setDuration] = useState(90); // Default 90 minutes

  useEffect(() => {
    fetchTables();
    if (view === 'my-bookings') {
      fetchMyBookings();
    }
  }, [view]);

  // Update filtered tables when date, time, or guests change
  useEffect(() => {
    if (view === 'book' && tables.length > 0) {
      getFilteredTables();
    }
  }, [date, time, guests, view, tables]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (error: any) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔍 Fetching bookings for user:', user.id);

      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching bookings:', error);
        throw error;
      }
      
      console.log('📦 Found bookings:', data?.length || 0);
      console.log('Booking details:', data);
      setMyBookings(data || []);
    } catch (error: any) {
      console.error('❌ Error in fetchMyBookings:', error);
      alert('Failed to load your bookings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const [filteredTables, setFilteredTables] = useState<RestaurantTable[]>([]);

  const getFilteredTables = async () => {
    if (!date || !time) {
      setFilteredTables([]);
      return;
    }
    
    try {
      console.log('🔍 Checking availability for:', { date, time, guests, duration });
      
      // Use the database function to check real-time availability
      // Note: Parameter names must match the SQL function exactly!
      const { data, error } = await supabase.rpc('get_available_tables_for_booking', {
        p_date: date,
        p_time: time,
        p_min_guests: guests
      });

      if (error) {
        console.error('❌ Error from RPC:', error);
        console.warn('⚠️ Falling back to client-side filtering. Make sure functions exist in Supabase!');
        
        // Fallback to client-side filtering if RPC fails
        const fallback = tables.filter(t => t.capacity >= guests);
        console.log(`✅ Fallback: Found ${fallback.length} tables`);
        setFilteredTables(fallback);
        return;
      }

      console.log('📦 Raw RPC response:', data);

      // Filter only available tables from the result
      const availableTablesWithDetails = data
        .filter((table: any) => {
          const isAvailable = table.p_is_available === true;
          console.log(`Table ${table.p_table_number}:`, {
            is_available: table.p_is_available,
            status: table.p_status,
            filtered_out: !isAvailable
          });
          return isAvailable;
        })
        .map((table: any) => ({
          id: table.p_id,
          table_number: table.p_table_number,
          capacity: table.p_capacity,
          status: table.p_status
        }));

      console.log(`✅ Found ${availableTablesWithDetails.length} available tables for ${guests} guests at ${time}`);
      console.log('Available tables:', availableTablesWithDetails);
      setFilteredTables(availableTablesWithDetails);
    } catch (error) {
      console.error('❌ Error in getFilteredTables:', error);
      setFilteredTables([]);
    }
  };

  const handleBooking = async () => {
    // Time Validation: 11:00 AM to 10:00 PM
    if (time < '11:00' || time > '22:00') {
      alert('Bookings are only accepted between 11:00 AM and 10:00 PM.');
      return;
    }

    if (!selectedTableId) {
      alert('Please select a table');
      return;
    }

    if (!phoneNumber) {
      alert('Please enter your phone number');
      return;
    }

    setBookingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to book a table');
        return;
      }

      // Get user profile for name and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      console.log('📝 Creating booking with duration:', duration);

      // Step 1: Create the booking record
      const { error: insertError } = await supabase
        .from('table_bookings')
        .insert({
          user_id: user.id,
          table_id: selectedTableId,
          booking_date: date,
          booking_time: time,
          guests_count: guests,
          status: 'pending',
          phone_number: phoneNumber,
          occasion: occasion || null,
          special_requests: specialRequests || null,
          customer_name: profile?.full_name || null,
          customer_email: profile?.email || null,
          booking_duration: duration
        });

      if (insertError) throw insertError;

      // Step 2: Reserve the table in restaurant_tables (time-slot reservation)
      const endTime = calculateEndTime(time, duration);
      console.log('⏰ Reserving table from', time, 'to', endTime);
      
      const { error: reserveError } = await supabase.rpc('reserve_table_for_time_slot', {
        p_table_id: selectedTableId,
        p_start_time: time,
        p_end_time: endTime,
        p_duration_minutes: duration
      });

      if (reserveError) {
        console.error('Warning: Could not reserve time slot:', reserveError);
        // Don't fail the booking, just log it
      }

      alert('🎉 Booking request sent to the restaurant! You\'ll receive a confirmation once it\'s approved.');
      setView('my-bookings');
      setSelectedTableId(null);
      setPhoneNumber('');
      setOccasion('');
      setSpecialRequests('');
    } catch (error: any) {
      console.error('Booking Error:', error);
      alert(error.message || 'Failed to book table');
    } finally {
      setBookingLoading(false);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const { error } = await supabase
        .from('table_bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      fetchMyBookings();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className={`min-h-screen bg-background ${hideHeader ? 'pb-4' : 'pb-20'}`}>
      {!hideHeader && <AppHeader title={view === 'book' ? 'Book Table' : 'My Bookings'} />}

      <div className={`px-4 py-4 space-y-6 ${hideHeader ? '!p-0' : ''}`}>
        {/* View Toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          <button
            onClick={() => setView('book')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${view === 'book' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
          >
            New Booking
          </button>
          <button
            onClick={() => setView('my-bookings')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${view === 'my-bookings' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
          >
            My Bookings
          </button>
        </div>

        {view === 'book' ? (
          <>
            {/* Booking Form */}
            <Card>
              <CardBody className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      min="11:00"
                      max="22:00"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Number of Guests
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <option key={num} value={num}>{num} Guests</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Booking Duration
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    <option value={60}>⏱️ Quick Visit - 60 minutes</option>
                    <option value={90}>🍽️ Standard Dining - 90 minutes</option>
                    <option value={120}>🎉 Long Celebration - 2 hours</option>
                    <option value={150}>👨‍👩‍👧‍👦 Family Gathering - 2.5 hours</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Standard dining is 90 minutes</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    Occasion (Optional)
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                  >
                    <option value="">Select Occasion</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">💍 Anniversary</option>
                    <option value="business_meeting">💼 Business Meeting</option>
                    <option value="date_night">❤️ Date Night</option>
                    <option value="family_gathering">👨‍👩‍👧‍👦 Family Gathering</option>
                    <option value="celebration">🎉 Celebration</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Special Requests (Optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any special requests? (e.g., window seat, high chair, etc.)"
                    rows={3}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Available Tables */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-foreground">Select a Table</h3>
                  {filteredTables.length > 0 && (
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Best suited for {guests} guests
                    </p>
                  )}
                </div>
                <button onClick={fetchTables} className="text-xs text-primary hover:underline">Refresh</button>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-3 animate-pulse">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl"></div>)}
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-border px-6">
                  <XCircle className="w-10 h-10 mx-auto mb-3 text-red-500/50" />
                  <p className="text-sm font-bold text-foreground">Sorry, the required size of table is not available online.</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Please visit the restaurant directly and we would love to make an arrangement for you. We would be honored to host you!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredTables.map((table) => {
                    const isSelected = selectedTableId === table.id;
                    const isAvailable = table.status === 'available';

                    return (
                      <Card
                        key={table.id}
                        onClick={() => isAvailable && setSelectedTableId(table.id)}
                        className={`transition-all duration-200 ${isSelected
                            ? 'ring-2 ring-primary border-primary shadow-md transform scale-[1.02]'
                            : isAvailable
                              ? 'hover:border-primary/50 cursor-pointer'
                              : 'opacity-50 grayscale cursor-not-allowed'
                          }`}
                      >
                        <CardBody className="p-4 text-center relative">
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <p className="text-3xl mb-2">
                            {table.capacity <= 2 ? '☕' : table.capacity <= 4 ? '🍽️' : '🍱'}
                          </p>
                          <p className="font-bold text-foreground">Table {table.table_number}</p>
                          <p className="text-xs text-muted-foreground mb-3">{table.capacity} Seats</p>
                          <Badge variant={isAvailable ? 'success' : 'info'} size="sm">
                            {isAvailable ? 'Best Match' : table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                          </Badge>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleBooking}
              isLoading={bookingLoading}
              disabled={!selectedTableId}
            >
              Confirm Reservation
            </Button>
          </>
        ) : (
          /* My Bookings View */
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-2xl"></div>)}
              </div>
            ) : myBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground font-medium">No bookings found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setView('book')}
                >
                  Book Your First Table
                </Button>
              </div>
            ) : (
              myBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden border-none shadow-md rounded-[2.5rem]">
                  <CardBody className="p-6">
                    {/* Header: Avatar, Table Info, Status */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#F8F2F2] rounded-full flex items-center justify-center">
                          <Users className="w-7 h-7 text-[#6B5353]" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#1F2937]">Table {booking.restaurant_tables?.table_number || '?'}</h3>
                          <p className="text-sm text-[#9CA3AF]">
                            {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm ${
                        booking.status === 'pending' ? 'bg-[#F97316] text-white' :
                        booking.status === 'confirmed' ? 'bg-[#16A34A] text-white' :
                        booking.status === 'cancelled' ? 'bg-[#DC2626] text-white' : 'bg-[#3B82F6] text-white'
                      }`}>
                        <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-[10px] transform -translate-y-[0.5px]">i</span>
                        </div>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </div>
                    </div>

                    <div className="h-px bg-[#F3F4F6] w-full mb-6" />

                    {/* Content: Guests and Booked Date */}
                    <div className="grid grid-cols-2 mb-8">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                          <Users className="w-4 h-4" />
                          <span>Guests</span>
                        </div>
                        <p className="font-bold text-[#1F2937] text-lg">{booking.guests_count} people</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#9CA3AF] text-sm">
                          <Clock className="w-4 h-4" />
                          <span>Booked</span>
                        </div>
                        <p className="font-medium text-[#9CA3AF] text-lg">
                          {new Date(booking.created_at || booking.booking_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-[#F3F4F6] w-full mb-6" />

                    {/* Action: Cancel Button */}
                    <button
                      onClick={() => booking.status === 'pending' && cancelBooking(booking.id)}
                      disabled={booking.status !== 'pending'}
                      className={`w-full py-3 rounded-full border gap-2 font-bold text-lg flex items-center justify-center transition-all ${
                        booking.status === 'pending' 
                        ? 'border-[#F87171] text-[#EF4444] active:bg-red-50' 
                        : 'border-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                        <span className="text-sm">✕</span>
                      </div>
                      Cancel Booking
                    </button>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
