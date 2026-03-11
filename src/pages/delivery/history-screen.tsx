import { CheckCircle2 } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';

export function DeliveryHistory() {
    return (
        <div className="space-y-4">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardBody className="p-6">
                    <p className="text-sm opacity-90">Today's Earnings</p>
                    <p className="text-3xl font-bold">₹840.00</p>
                    <p className="text-xs mt-2 opacity-80">Completed 12 deliveries today</p>
                </CardBody>
            </Card>

            <h3 className="font-bold text-foreground">Recent Deliveries</h3>
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Order #1234{i}</p>
                            <p className="text-xs text-muted-foreground">Jan 28, 2026 • 2:30 PM</p>
                        </div>
                    </div>
                    <p className="font-bold text-green-600">+₹70</p>
                </div>
            ))}
        </div>
    );
}
