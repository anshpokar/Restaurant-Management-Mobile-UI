import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
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
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title={`Table ${tableNumber} - Start Session`} />

      <div className="px-4 py-6 space-y-6">
        {/* Customer Info Summary */}
        <Card>
          <CardBody className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase">Customer Type</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {customerType === 'existing' ? 'Existing Customer ✓' : 
                     customerType === 'new' ? 'New Customer ✓' : 'Guest'}
                  </p>
                </div>
              </div>

              {email && (
                <div className="flex items-center gap-3 pt-2 border-t border-divider">
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase">Verified Email</p>
                    <p className="text-sm font-medium text-foreground">{email}</p>
                  </div>
                </div>
              )}

              {fullName && (
                <div className="flex items-center gap-3 pt-2 border-t border-divider">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase">Customer Name</p>
                    <p className="text-sm font-medium text-foreground">{fullName}</p>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Session Name Input */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <ShoppingBag className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold text-foreground mb-1">
                  Session Name
                </h3>
                <p className="text-sm text-muted-foreground">
                  Give this session a memorable name for easy identification
                </p>
              </div>
            </div>

            <Input
              type="text"
              placeholder='e.g., "Team Lunch", "Birthday Dinner"'
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              autoFocus
              className="mb-3"
            />

            {/* Suggested Names */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedNames.map((name, index) => (
                  <button
                    key={index}
                    onClick={() => setSessionName(name)}
                    className="px-3 py-1.5 bg-muted hover:bg-primary/10 text-foreground hover:text-primary text-xs font-medium rounded-lg transition-colors border border-border"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Session Details Preview */}
        <Card>
          <CardBody className="p-4 bg-muted/50">
            <h4 className="font-bold text-foreground mb-3 text-sm">Session Details:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Table:</span>
                <span className="font-medium text-foreground">Table {tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment:</span>
                <span className="font-medium text-orange-600">Pending</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Linked To:</span>
                <span className="font-medium text-foreground">
                  {userId ? (customerType === 'guest' ? 'Guest' : 'User Account') : 'Walk-in Customer'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Start Session Button */}
        <Button
          onClick={handleStartSession}
          className="w-full h-14 text-lg"
          isLoading={loading}
          disabled={!sessionName.trim()}
        >
          <ShoppingBag className="w-5 h-5 mr-2" />
          {loading ? 'Starting Session...' : 'Start Session & Add Items'}
        </Button>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Once started, you can add items to this session and manage orders from the menu screen.
          </p>
        </div>
      </div>
    </div>
  );
}
