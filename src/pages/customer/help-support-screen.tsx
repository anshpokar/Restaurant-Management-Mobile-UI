import { useState } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { HelpCircle, MessageSquare, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { type Profile } from '@/lib/supabase';
import { useSupportTickets } from '@/hooks/use-support-tickets';

export function HelpSupportScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const { tickets, loading, fetchTickets, createTicket } = useSupportTickets(profile?.id || null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTicket({
        ...newTicket,
        status: 'open',
        admin_response: undefined,
        resolved_at: undefined
      });
      setIsCreating(false);
      setNewTicket({ subject: '', description: '', priority: 'normal' });
      alert('Support ticket created successfully!');
      fetchTickets();
    } catch (error) {
      alert('Failed to create ticket');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return { variant: 'warning' as const, icon: AlertCircle };
      case 'in_progress': return { variant: 'info' as const, icon: MessageSquare };
      case 'resolved': return { variant: 'success' as const, icon: CheckCircle };
      case 'closed': return { variant: 'default' as const, icon: HelpCircle };
      default: return { variant: 'default' as const, icon: HelpCircle };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'normal': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader 
        title="Help & Support" 
        actions={
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> New Ticket
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Create Ticket Form */}
        {isCreating && (
          <Card>
            <CardBody className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Subject</label>
                  <input
                    required
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    required
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none min-h-[120px]"
                    placeholder="Describe your issue in detail..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Submit Ticket</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreating(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-foreground">No support tickets</p>
            <p className="text-xs text-muted-foreground mt-1">Create a ticket if you need help</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: any) => {
              const statusInfo = getStatusBadge(ticket.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={ticket.id}>
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1">{ticket.subject}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                      <Badge variant={statusInfo.variant} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-divider">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {ticket.status === 'resolved' && ticket.resolved_at && (
                        <span className="text-[10px] text-green-600 font-medium">
                          Resolved on {new Date(ticket.resolved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {ticket.admin_response && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-3 h-3 text-primary" />
                          <span className="text-xs font-bold text-primary">Admin Response</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ticket.admin_response}</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
