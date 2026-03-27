import { Truck, LogOut as LogOutIcon, ShieldCheck, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { useOutletContext } from 'react-router-dom';
import { Profile } from '@/lib/supabase';

export function DeliveryProfile() {
    const { onLogout, profile } = useOutletContext<{ onLogout: () => void, profile: Profile | null }>();

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <Truck className="w-12 h-12 text-primary" />
                    )}
                </div>
                <h3 className="text-2xl font-black text-foreground">{profile?.full_name || 'Delivery Partner'}</h3>
                <p className="text-xs font-bold text-primary tracking-widest uppercase mt-1">
                    ID: {profile?.id?.slice(0, 8).toUpperCase() || 'LOADING...'}
                </p>
                <div className="flex justify-center gap-2 mt-4">
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                        Verified Partner
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 px-2">
                <div className="bg-surface p-4 rounded-2xl border border-divider flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Phone Number</p>
                        <p className="font-bold text-foreground">{profile?.phone_number || 'Not provided'}</p>
                    </div>
                </div>

                <div className="bg-surface p-4 rounded-2xl border border-divider flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Email Address</p>
                        <p className="font-bold text-foreground">{profile?.email || 'Not provided'}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 px-2 pt-4">
                <Button variant="outline" className="w-full h-14 justify-start gap-3 rounded-2xl font-bold border-divider hover:bg-muted/50">
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
    );
}
