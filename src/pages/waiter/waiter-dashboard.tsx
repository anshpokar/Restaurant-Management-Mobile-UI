import { LayoutGrid } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { RestaurantTable } from '@/lib/supabase';
import { useOutletContext, useNavigate } from 'react-router-dom';

export function WaiterDashboard() {
    const navigate = useNavigate();
    const { tables, loading, fetchTables } = useOutletContext<{
        tables: RestaurantTable[],
        loading: boolean,
        fetchTables: () => void
    }>();

    const onTableClick = (table: RestaurantTable) => {
        navigate(`ordering/${table.id}`);
    };

    return (
        <div className="p-4 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-foreground">Table Management</h2>
                    <p className="text-sm text-muted-foreground">Select a table to start an order</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTables} isLoading={loading}>
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tables.length === 0 && !loading ? (
                    <div className="col-span-full py-20 text-center bg-card rounded-3xl border-2 border-dashed border-divider">
                        <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                        <p className="font-bold text-muted-foreground">No tables found in database</p>
                        <p className="text-xs text-muted-foreground mt-1">Please add tables in the Admin section</p>
                    </div>
                ) : (
                    tables.map(table => (
                        <Card
                            key={table.id}
                            onClick={() => onTableClick(table)}
                            className={`cursor-pointer transition-all active:scale-95 border-2 ${table.status === 'occupied'
                                ? 'bg-red-50 border-red-200'
                                : table.status === 'reserved'
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-green-50 border-green-200 hover:border-primary'
                                }`}
                        >
                            <CardBody className="p-6 text-center">
                                <div className="text-4xl mb-2">
                                    {table.status === 'occupied' ? '👨‍👩‍👧‍👦' : '🍽️'}
                                </div>
                                <h3 className="text-xl font-black text-foreground">Table {table.table_number}</h3>
                                <p className="text-xs font-bold text-muted-foreground mb-3">{table.capacity} Seats</p>
                                <Badge variant={table.status === 'occupied' ? 'occupied' : table.status === 'reserved' ? 'warning' : 'success'}>
                                    {table.status.toUpperCase()}
                                </Badge>
                            </CardBody>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
