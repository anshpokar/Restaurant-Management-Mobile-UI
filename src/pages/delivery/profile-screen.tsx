import { Truck, User, LogOut as LogOutIcon } from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { useOutletContext } from 'react-router-dom';

export function DeliveryProfile() {
    const { onLogout } = useOutletContext<{ onLogout: () => void }>();

    return (
        <div className="space-y-6">
            <div className="text-center py-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Truck className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Rajesh Kumar</h3>
                <p className="text-sm text-muted-foreground">ID: DEL-98765</p>
            </div>

            <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-3">
                    <User className="w-5 h-5" /> Account Details
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3 text-destructive" onClick={onLogout}>
                    <LogOutIcon className="w-5 h-5" /> Logout
                </Button>
            </div>
        </div>
    );
}
