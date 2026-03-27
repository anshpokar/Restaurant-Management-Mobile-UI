import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { User, Search, Loader2, UserPlus, Shield, Truck, UtensilsCrossed, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';
import { toast } from 'sonner';


export function AdminUserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

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

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader 
        title="Access Control" 
        actions={
          <button className="p-2.5 hover:bg-muted rounded-2xl transition-all group">
            <UserPlus className="w-5 h-5 text-brand-maroon group-hover:scale-110 transition-transform" />
          </button>
        }
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 space-y-8 max-w-[1200px] mx-auto"
      >
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand-maroon transition-colors" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent focus:border-brand-maroon/20 rounded-[2rem] shadow-xl shadow-black/5 outline-none transition-all placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Role Filters */}
        <div className="flex gap-2 p-1.5 bg-white/50 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-xl shadow-black/5 overflow-x-auto no-scrollbar">
          {(['all', 'admin', 'chef', 'waiter', 'delivery', 'customer'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-6 py-3 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 ${
                selectedRole === role 
                  ? 'bg-brand-maroon text-white shadow-lg shadow-brand-maroon/20 scale-105' 
                  : 'text-muted-foreground hover:bg-white hover:text-brand-maroon'
              }`}
            >
              {role === 'all' ? 'Universal Sync' : role}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center"
              >
                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-brand-maroon/20" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Querying identity vault...</p>
              </motion.div>
            ) : filteredUsers.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-muted"
              >
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No matching personnel detected</p>
              </motion.div>
            ) : (
              filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="shadow-xl shadow-black/5 border-none rounded-[2.5rem] group hover:shadow-2xl hover:shadow-brand-maroon/5 overflow-hidden transition-all duration-300">
                    <CardBody className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors shadow-inner ${
                            user.role === 'admin' ? 'bg-brand-maroon/5 border-brand-maroon/10 text-brand-maroon' : 
                            user.role === 'delivery' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                            'bg-muted/50 border-transparent text-muted-foreground'
                          }`}>
                            {user.role === 'admin' ? <Shield className="w-7 h-7" /> : 
                             user.role === 'delivery' ? <Truck className="w-7 h-7" /> : 
                             user.role === 'chef' ? <UtensilsCrossed className="w-7 h-7" /> :
                             <UserCircle className="w-7 h-7" />}
                          </div>
                          <div>
                            <h4 className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors">{user.full_name || 'ANONYMOUS'}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{user.email}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={user.role === 'admin' ? 'paid' : user.role === 'delivery' ? 'info' : 'secondary'}
                          className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0"
                        >
                          {user.role}
                        </Badge>
                      </div>

                      <div className="pt-5 border-t border-dashed border-border/50">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Security Permissions</p>
                          <div className={`w-2 h-2 rounded-full ${updatingId === user.id ? 'bg-brand-maroon animate-ping' : 'bg-emerald-500'}`} />
                        </div>
                        
                        <div className="relative">
                           <select
                             defaultValue={user.role}
                             onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                             disabled={updatingId === user.id}
                             className="w-full pl-5 pr-10 py-4 bg-muted/30 hover:bg-muted/50 border-none rounded-2xl text-[10px] font-black text-foreground appearance-none outline-none transition-all cursor-pointer uppercase tracking-widest"
                           >
                             <option value="customer">Customer Access</option>
                             <option value="chef">Kitchen Master</option>
                             <option value="waiter">Service Personnel</option>
                             <option value="delivery">Logistics Partner</option>
                             <option value="admin">System Architect</option>
                           </select>
                           <Shield className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
