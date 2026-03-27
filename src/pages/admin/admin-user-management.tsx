import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { User, Search, Loader2, Edit } from 'lucide-react';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';
import { toast } from 'sonner';


export function AdminUserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Fetch Users Error:', error);
      toast.error(error.message || 'Error fetching users');
    } finally {

      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      console.error('Update Role Error:', error);
      toast.error(error.message || 'Error updating role');
    } finally {

      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="User Management" />

      <div className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No users found matching your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardBody className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{user.full_name || 'No Name'}</h4>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={user.role === 'admin' ? 'success' : user.role === 'delivery' ? 'info' : 'warning'}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </div>

                  <div className="pt-3 border-t border-divider">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Change User Role</p>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                          <Loader2 className={`w-4 h-4 text-primary ${updatingId === user.id ? 'animate-spin' : 'hidden'}`} />
                          {!updatingId && <div className="w-2 h-2 rounded-full bg-primary" />}
                       </div>
                       <select
                         defaultValue={user.role}
                         onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                         disabled={updatingId === user.id}
                         className="w-full pl-9 pr-4 py-3 bg-muted/50 hover:bg-muted border border-transparent focus:border-primary/30 rounded-xl text-sm font-bold text-foreground appearance-none outline-none transition-all cursor-pointer"
                       >
                         <option value="customer">👤 Customer</option>
                         <option value="chef">🧑‍🍳 Chef</option>
                         <option value="waiter">🤵 Waiter</option>
                         <option value="delivery">🚚 Delivery Partner</option>
                         <option value="admin">🛡️ Admin</option>
                       </select>
                       <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                          <Edit className="w-3 h-3" />
                       </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
