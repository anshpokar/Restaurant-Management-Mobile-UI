import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { User, SkipForward, Shield } from 'lucide-react';

export function WaiterCustomerSelectionScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const [selectedOption, setSelectedOption] = useState<'existing' | 'guest' | null>(null);
  const [email, setEmail] = useState('');
  const [loading] = useState(false);
  const GUEST_USER_ID = '77088b0f-1656-46f2-ba9b-8d6ff13f42f2'; // Real user ID provided by merchant

  const handleExistingCustomer = () => {
    if (!email.trim()) {
      alert('Please enter customer email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Navigate to OTP verification with email
    navigate(`/waiter/otp-verify/${tableId}`, { 
      state: { email: email.trim() } 
    });
  };

  const handleGuest = () => {
    // Start session using the persistent dummy user profile
    navigate(`/waiter/session/start/${tableId}`, {
      state: { 
        customerType: 'guest',
        userId: GUEST_USER_ID,
        verified: true 
      }
    });
  };

  return (
    <div className="min-h-screen bg-warm-off-white pb-4">
      <AppHeader title={`Table ${tableId}`} showBack />

      <div className="px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-maroon/5 border border-brand-maroon/10 text-[10px] font-black text-brand-maroon uppercase tracking-[0.2em]">
            Service Step 01
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            Guest Protocol
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Standard operating procedure for new orders
          </p>
        </div>

        <div className="space-y-4">
          {/* Option 1: Existing Customer */}
          <Card
            onClick={() => setSelectedOption('existing')}
            className={`cursor-pointer transition-all duration-300 border-2 rounded-[2rem] overflow-hidden shadow-premium ${
              selectedOption === 'existing'
                ? 'border-brand-maroon bg-white ring-4 ring-brand-maroon/5 scale-[1.02]'
                : 'border-transparent bg-white hover:border-brand-maroon/20 hover:scale-[1.01]'
            }`}
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-5">
                <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedOption === 'existing' ? 'bg-brand-maroon text-white' : 'bg-brand-maroon/10 text-brand-maroon'
                }`}>
                  <User className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-foreground mb-1">
                    Loyalty Member
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-4">
                    Send OTP Verification
                  </p>
                  
                  {selectedOption === 'existing' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Input
                        type="email"
                        placeholder="customer@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                        className="h-12 bg-warm-beige border-none ring-1 ring-divider focus:ring-2 focus:ring-brand-maroon rounded-xl"
                      />
                      <Button
                        onClick={handleExistingCustomer}
                        className="w-full h-12 bg-brand-maroon hover:bg-[#5D1227] text-white rounded-xl shadow-lg shadow-brand-maroon/20"
                        isLoading={loading}
                      >
                        <Shield className="w-5 h-5 mr-2" />
                        Verify Identity
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Option 2: Guest Checkout */}
          <Card
            onClick={() => setSelectedOption('guest')}
            className={`cursor-pointer transition-all duration-300 border-2 rounded-[2rem] overflow-hidden shadow-premium ${
              selectedOption === 'guest'
                ? 'border-brand-gold bg-white ring-4 ring-brand-gold/5 scale-[1.02]'
                : 'border-transparent bg-white hover:border-brand-gold/20 hover:scale-[1.01]'
            }`}
          >
            <CardBody className="p-6">
              <div className="flex items-start gap-5">
                <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedOption === 'guest' ? 'bg-brand-gold text-white' : 'bg-brand-gold/10 text-brand-gold'
                }`}>
                  <SkipForward className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-foreground mb-1">
                    Direct Guest
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-4">
                    Immediate Order Entry
                  </p>
                  
                  {selectedOption === 'guest' && (
                    <Button
                      onClick={handleGuest}
                      className="w-full h-12 bg-brand-gold hover:bg-[#B8962F] text-white rounded-xl shadow-lg shadow-brand-gold/20 font-black animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      <SkipForward className="w-5 h-5 mr-2" />
                      Open Table Session
                    </Button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="bg-brand-maroon/5 rounded-[1.5rem] p-5 border border-brand-maroon/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1.5 h-6 bg-brand-gold rounded-full" />
            <h4 className="font-black text-brand-maroon text-sm uppercase tracking-widest">Protocol Tip</h4>
          </div>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Use <span className="text-brand-maroon font-bold">Loyalty</span> for repeat guests to track history. Use <span className="text-brand-gold font-bold">Guest</span> for quick walk-ins or rush hours.
          </p>
        </div>
      </div>
    </div>
  );
}
