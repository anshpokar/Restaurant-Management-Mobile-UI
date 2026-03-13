import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { User, UserPlus, SkipForward, Mail, Shield } from 'lucide-react';

export function WaiterCustomerSelectionScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const [selectedOption, setSelectedOption] = useState<'existing' | 'new' | 'guest' | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleNewCustomer = () => {
    navigate(`/waiter/signup/${tableId}`);
  };

  const handleGuest = () => {
    // Start session without user verification
    navigate(`/waiter/session/start/${tableId}`, {
      state: { customerType: 'guest' }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title={`Table ${tableId} - Customer Type`} />

      <div className="px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground mb-2">
            Select Customer Type
          </h2>
          <p className="text-sm text-muted-foreground">
            How would you like to proceed with this order?
          </p>
        </div>

        {/* Option 1: Existing Customer */}
        <Card
          onClick={() => setSelectedOption('existing')}
          className={`cursor-pointer transition-all border-2 ${
            selectedOption === 'existing'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Already a Customer
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Customer has an existing account. We'll send an OTP to verify their identity.
                </p>
                
                {selectedOption === 'existing' && (
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      icon={<Mail className="w-4 h-4" />}
                      autoFocus
                    />
                    <Button
                      onClick={handleExistingCustomer}
                      className="w-full"
                      isLoading={loading}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Send OTP Verification
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Option 2: New Customer */}
        <Card
          onClick={() => setSelectedOption('new')}
          className={`cursor-pointer transition-all border-2 ${
            selectedOption === 'new'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  New Customer
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Customer wants to create a new account. Collect their details and verify with OTP.
                </p>
                
                {selectedOption === 'new' && (
                  <Button
                    onClick={handleNewCustomer}
                    variant="outline"
                    className="w-full"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create New Account
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Option 3: Guest Checkout */}
        <Card
          onClick={() => setSelectedOption('guest')}
          className={`cursor-pointer transition-all border-2 ${
            selectedOption === 'guest'
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
              : 'border-border hover:border-blue-500/50'
          }`}
        >
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <SkipForward className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Continue Without Signup
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start session immediately without creating an account. No verification required.
                </p>
                
                {selectedOption === 'guest' && (
                  <Button
                    onClick={handleGuest}
                    variant="secondary"
                    className="w-full"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Start Guest Session
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Info Box */}
        <div className="bg-muted/50 rounded-2xl p-4 border border-divider">
          <h4 className="font-bold text-foreground mb-2 text-sm">💡 Quick Guide:</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li><strong className="text-foreground">Existing:</strong> For customers with accounts → Email + OTP</li>
            <li><strong className="text-foreground">New:</strong> For first-time customers → Signup form + OTP</li>
            <li><strong className="text-foreground">Guest:</strong> Quick checkout → No account needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
