import { MapPin, User } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Button } from '@/components/design-system/button';

export function DeliveryTasks() {
    return (
        <div className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-sm font-medium text-primary mb-1">Status: Online</p>
                <p className="text-xs text-muted-foreground">You are currently visible to new orders.</p>
            </div>

            <h3 className="font-bold text-foreground">Active Orders</h3>
            {[
                { id: '#12344', customer: 'Jane Smith', address: 'B-42, Sector 15, Noida', items: '2 items', status: 'ready' },
                { id: '#12345', customer: 'John Doe', address: 'C-10, Connaught Place', items: '3 items', status: 'picked_up' }
            ].map(order => (
                <Card key={order.id}>
                    <CardBody className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="font-bold text-foreground">{order.id}</p>
                                <p className="text-xs text-muted-foreground">{order.items}</p>
                            </div>
                            <Badge variant={order.status === 'ready' ? 'warning' : 'info'}>
                                {order.status === 'ready' ? 'Ready to Pick' : 'In Transit'}
                            </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{order.customer}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="truncate">{order.address}</span>
                            </div>
                        </div>

                        <Button className="w-full" size="sm">
                            {order.status === 'ready' ? 'Pick Up Order' : 'Mark as Delivered'}
                        </Button>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
}
