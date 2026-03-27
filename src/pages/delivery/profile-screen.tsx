import { Truck, LogOut as LogOutIcon, ShieldCheck, Phone, Mail, Wallet, Coins, History, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Profile } from '@/lib/supabase';
import { useSettlements } from '@/hooks/useSettlements';
import { Card, CardBody } from '@/components/design-system/card';

export function DeliveryProfile() {
    const { onLogout, profile } = useOutletContext<{ onLogout: () => void, profile: Profile | null }>();
    const navigate = useNavigate();
    const { history } = useSettlements();

    const pendingSettlements = history.filter(s => s.driver_id === profile?.id && s.status === 'pending');

    return (
        <div className="space-y-6 pb-24">
            <div className="text-center py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <Truck className="w-12 h-12 text-primary" />
                    )}
                </div>
                <h3 className="text-2xl font-black text-foreground">{profile?.full_name || 'Delivery Partner'}</h3>
                <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mt-1">
                    Partner ID: {profile?.id?.slice(0, 8).toUpperCase() || 'LOADING...'}
                </p>
            </div>

            {/* Financial Overview */}
            <div className="px-4 grid grid-cols-2 gap-3">
                <Card className="bg-green-50 border-green-100">
                    <CardBody className="p-4">
                        <Coins className="w-5 h-5 text-green-600 mb-2" />
                        <p className="text-[10px] font-black text-green-800 uppercase tracking-widest">Your Earnings</p>
                        <p className="text-xl font-black text-green-700">₹{profile?.total_earnings || 0}</p>
                    </CardBody>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                    <CardBody className="p-4">
                        <Wallet className="w-5 h-5 text-orange-600 mb-2" />
                        <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Cash in Hand</p>
                        <p className="text-xl font-black text-orange-700">₹{profile?.cash_collected || 0}</p>
                    </CardBody>
                </Card>
            </div>

            {/* Pending Settlements Alert */}
            {pendingSettlements.length > 0 && (
                <div className="px-4">
                    <button 
                        onClick={() => navigate('/delivery/settlements')}
                        className="w-full bg-primary text-white p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-primary/20 animate-pulse"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6" />
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-widest leading-none">Action Required</p>
                                <p className="text-sm font-bold mt-1">{pendingSettlements.length} Settlement Pending</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="px-4 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground ml-1">Account & History</h3>
                
                <Button 
                    variant="outline" 
                    className="w-full h-16 justify-between rounded-2xl font-bold border-divider bg-card shadow-sm"
                    onClick={() => navigate('/delivery/settlements')}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <History className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                           <p className="text-sm">Settlement History</p>
                           <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">Cash & Payout Logs</p>
                        </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>

                <div className="grid grid-cols-1 gap-3">
                    <div className="bg-surface p-4 rounded-2xl border border-divider flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Phone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Phone Number</p>
                            <p className="font-bold text-foreground text-sm">{profile?.phone_number || 'Not provided'}</p>
                        </div>
                    </div>

                    <div className="bg-surface p-4 rounded-2xl border border-divider flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                            <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Email Address</p>
                            <p className="font-bold text-foreground text-sm">{profile?.email || 'Not provided'}</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 space-y-3">
                    <Button variant="outline" className="w-full h-14 justify-start gap-3 rounded-2xl font-bold border-border bg-card">
                        <ShieldCheck className="w-5 h-5 text-primary" /> Verification Documents
                    </Button>
                    <Button 
                        variant="outline" 
                        className="w-full h-14 justify-start gap-3 text-destructive rounded-2xl font-bold border-destructive/20 hover:bg-destructive/5" 
                        onClick={onLogout}
                    >
                        <LogOutIcon className="w-5 h-5" /> Logout from Session
                    </Button>
                </div>
            </div>
        </div>
    );
}
