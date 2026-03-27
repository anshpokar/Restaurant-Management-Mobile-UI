import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { Badge } from '@/components/design-system/badge';
import { ShoppingBag, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/cart-context';
import { toast } from 'sonner';


export function WaiterSessionStartScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const location = useLocation(); // Added this line to define 'location'
  const { customerInfo } = useCart();
  
  const customerType = location.state?.customerType || (customerInfo ? 'existing' : 'guest');
  const userId = location.state?.userId || customerInfo?.id || null;
  const email = location.state?.email || customerInfo?.email || '';
  const fullName = location.state?.fullName || customerInfo?.full_name || '';

  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableNumber, setTableNumber] = useState<string>('');

  useEffect(() => {
    fetchTableNumber();
  }, [tableId]);

  const fetchTableNumber = async () => {
    try {
      const { data: table } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('id', tableId)
        .single();
      
      if (table) {
        setTableNumber(table.table_number.toString());
      }
    } catch (error) {
      console.error('Error fetching table:', error);
    }
  };

  const handleStartSession = async () => {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name (e.g., "Team Lunch", "Table Order")');
      return;
    }


    setLoading(true);
    try {
      // ✅ Use dine_in_sessions (same table as customer flow)
      const { data: session, error } = await supabase
        .from('dine_in_sessions')
        .insert({
          table_id: tableId,
          user_id: userId || null,              // Link to customer if available
          session_status: 'active',             // Match customer field name
          payment_status: 'pending',
          total_amount: 0,                      // No orders yet
          paid_amount: 0,
          session_name: sessionName.trim(),
          notes: `Waiter-created session for ${customerType} customer` + 
                 (email ? ` - ${email}` : '') +
                 (fullName ? ` - ${fullName}` : ''),
        })
        .select('id, session_name, table_id')
        .single();

      if (error) throw error;

      // Update table status to occupied (same as customer flow)
      await supabase
        .from('restaurant_tables')
        .update({
          status: 'occupied',
          occupied_at: new Date().toISOString(),
          occupied_by_customer_name: fullName || sessionName.trim(),
          occupied_by_customer_email: email || null,
          current_session_id: session.id  // Link to the session
        })
        .eq('id', tableId);

      toast.success('✅ Session started successfully!');


      // Navigate to session menu/ordering screen
      navigate(`/waiter/ordering/${tableId}`, {
        state: {
          sessionId: session.id,
          tableId: tableId,
          customerType: customerType,
          userId: userId,
          sessionName: sessionName.trim()
        }
      });

    } catch (error: any) {
      console.error('Error starting session:', error);
      toast.error('❌ Failed to start session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const suggestedNames = [
    `Table ${tableNumber} Order`,
    `${fullName || 'Customer'}'s Session`,
    'Dine-in Session',
    'Team Lunch',
    'Dinner Party'
  ];

  return (
    <div className="min-h-screen bg-warm-off-white pb-4">
      <AppHeader title={`Table ${tableNumber}`} showBack />

      <div className="px-4 py-8 space-y-8">
        {/* Step Indicator */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-maroon/5 border border-brand-maroon/10 text-[10px] font-black text-brand-maroon uppercase tracking-[0.2em]">
            Service Step 03
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            Session Startup
          </h2>
        </div>

        {/* Customer Info Summary */}
        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden bg-white">
          <CardBody className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  customerType === 'existing' ? 'bg-brand-maroon/10 text-brand-maroon' : 'bg-brand-gold/10 text-brand-gold'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Protocol Link</p>
                  <p className="text-sm font-bold text-foreground capitalize">
                    {customerType === 'existing' ? 'Loyalty Member ✓' : 'Direct Guest Instance'}
                  </p>
                </div>
              </div>

              {(email || fullName) && (
                <div className="pt-4 border-t border-divider space-y-3">
                  {fullName && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-maroon" />
                      <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                      <p className="text-xs font-medium text-muted-foreground truncate">{email}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Session Name Input */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-brand-maroon uppercase tracking-widest ml-1">Assign Identifier</label>
            <Input
              type="text"
              placeholder='e.g., "Main Dining", "Private Party"'
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              autoFocus
              className="h-16 bg-white border-2 border-divider focus:border-brand-maroon focus:ring-4 focus:ring-brand-maroon/5 text-lg font-bold rounded-2xl px-6 transition-all"
            />
          </div>

          {/* Suggested Names */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Preset Identifiers:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedNames.map((name, index) => (
                <button
                  key={index}
                  onClick={() => setSessionName(name)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                    sessionName === name 
                      ? 'bg-brand-maroon border-brand-maroon text-white shadow-lg shadow-brand-maroon/20' 
                      : 'bg-white border-divider text-muted-foreground hover:border-brand-maroon/30 hover:text-brand-maroon'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Session Details Preview */}
        <Card className="border-none bg-brand-maroon/[0.02] rounded-[1.5rem] border border-brand-maroon/5">
          <CardBody className="p-5">
            <h4 className="text-[10px] font-black text-brand-maroon uppercase tracking-widest mb-4">Instance Parameters</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Station</span>
                <span className="text-sm font-black text-foreground">TABLE {tableNumber}</span>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Status</span>
                <Badge variant="paid" className="bg-brand-gold/20 text-brand-gold border-brand-gold/30 font-black text-[10px] uppercase">
                  ACTIVE
                </Badge>
              </div>
              <div className="flex justify-between items-center bg-white/50 p-2 rounded-xl">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Security</span>
                <span className="text-xs font-bold text-foreground">
                  {userId ? (customerType === 'guest' ? 'GUEST TOKEN' : 'ENCRYPTED ID') : 'STATION AUTH'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Action Button */}
        <Button
          onClick={handleStartSession}
          className="w-full h-16 bg-brand-maroon hover:bg-[#5D1227] text-white rounded-[1.5rem] shadow-2xl shadow-brand-maroon/30 font-black text-xl tracking-tight mt-4 transition-all"
          isLoading={loading}
          disabled={!sessionName.trim()}
        >
          <ShoppingBag className="w-6 h-6 mr-3" />
          {loading ? 'INITIALIZING...' : 'START SESSION'}
        </Button>

        {/* Security Info */}
        <div className="opacity-20 flex flex-col items-center gap-2 py-4">
          <CheckCircle className="w-5 h-5 text-brand-maroon" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">Operational Readiness Confirmed</span>
        </div>
      </div>
    </div>
  );
}
