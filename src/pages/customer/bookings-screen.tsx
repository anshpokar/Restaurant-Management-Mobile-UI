import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Calendar, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase, type RestaurantTable, type TableBooking } from '@/lib/supabase';
import { Badge } from '@/components/design-system/badge';

export function BookingsScreen({ hideHeader = false }: { hideHeader?: boolean }) {
  const [view, setView] = useState<'book' | 'my-bookings'>('book');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [myBookings, setMyBookings] = useState<TableBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [guests, setGuests] = useState(2);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  useEffect(() => {
    fetchTables();
    if (view === 'my-bookings') {
      fetchMyBookings();
    }
  }, [view]);

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

      const { data, error } = await supabase
        .from('table_bookings')
        .select(`
          *,
          restaurant_tables (*)
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setMyBookings(data || []);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTables = () => {
    const availableTables = tables.filter(t => t.status === 'available' && t.capacity >= guests);

    if (availableTables.length === 0) return [];

    // Find the smallest capacity that can accommodate the guests
    const minCapacity = Math.min(...availableTables.map(t => t.capacity));

    // Return tables that match this minimum capacity
    return availableTables.filter(t => t.capacity === minCapacity);
  };

  const filteredTables = getFilteredTables();

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

    setBookingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to book a table');
        return;
      }

      const { error } = await supabase
        .from('table_bookings')
        .insert({
          user_id: user.id,
          table_id: selectedTableId,
          booking_date: date,
          booking_time: time,
          guests_count: guests,
          status: 'pending'
        });

      if (error) throw error;

      alert('Booking request sent successfully!');
      setView('my-bookings');
      setSelectedTableId(null);
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
                <Card key={booking.id} className="overflow-hidden">
                  <CardBody className="p-0">
                    <div className="flex">
                      <div className={`w-2 ${booking.status === 'confirmed' ? 'bg-green-500' :
                          booking.status === 'pending' ? 'bg-yellow-500' :
                            booking.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg">Table {booking.restaurant_tables?.table_number || '?'}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                            </p>
                          </div>
                          <Badge variant={
                            booking.status === 'confirmed' ? 'success' :
                              booking.status === 'pending' ? 'warning' :
                                booking.status === 'cancelled' ? 'error' : 'info'
                          }>
                            {booking.status.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3 pt-3 border-t border-divider">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" /> {booking.guests_count} Guests
                          </span>
                          {booking.status === 'pending' && (
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              className="ml-auto text-red-500 font-medium text-xs flex items-center gap-1 hover:underline"
                            >
                              <XCircle className="w-3 h-3" /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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
