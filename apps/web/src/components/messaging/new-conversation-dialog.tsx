import { useState, type ComponentProps } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useCoaches } from '@/features/coaching';
import { useCoachClients, type CoachClient } from '@/features/coaching';
import { useGymPartners } from '@/features/social';
import { useStartConversation } from '@/features/messaging';

interface NewConversationDialogProps {
  onConversationCreated?: (conversationId: string) => void;
  triggerClassName?: string;
  triggerSize?: ComponentProps<typeof Button>['size'];
  showLabel?: boolean;
}

export function NewConversationDialog({
  onConversationCreated,
  triggerClassName,
  triggerSize = 'sm',
  showLabel = true,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { hasPermission, user } = useAuth();
  const isCoach = hasPermission('coaching:read');

  const { data: coachesData, isLoading: coachesLoading } = useCoaches({
    available: true,
    limit: 50,
  });
  const { data: gymPartnersData, isLoading: gymPartnersLoading } =
    useGymPartners({ status: 'ACCEPTED', limit: 50 });
  const { data: clientsData, isLoading: clientsLoading } = useCoachClients();

  const isLoading =
    coachesLoading || gymPartnersLoading || (isCoach && clientsLoading);

  const startConversation = useStartConversation({
    onSuccess: (response) => {
      onConversationCreated?.(response.data.id);
      setOpen(false);
      setSearch('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start conversation');
    },
  });

  const coaches =
    coachesData?.data?.items?.filter((coach) => coach.userId !== user?.sub) ??
    [];
  const gymPartners =
    gymPartnersData?.data?.partners?.filter(
      (partner) => partner.user.id !== user?.sub,
    ) ?? [];
  const clients = clientsData?.data?.clients ?? [];

  const query = search.trim().toLowerCase();

  const filteredCoaches = coaches.filter((coach) => {
    if (!query) return true;
    const name = coach.profile?.displayName ?? coach.title ?? '';
    return name.toLowerCase().includes(query);
  });

  const filteredGymPartners = gymPartners.filter((partner) => {
    if (!query) return true;
    const name = partner.user.displayName ?? '';
    return name.toLowerCase().includes(query);
  });

  const filteredClients = clients.filter((client) => {
    if (!query) return true;
    const name = client.user.displayName ?? client.user.email ?? '';
    return name.toLowerCase().includes(query);
  });

  const handleSelectCoach = (coachId: string) => {
    startConversation.mutate({ coachId });
  };

  const handleSelectGymPartner = (recipientUserId: string) => {
    startConversation.mutate({ recipientUserId });
  };

  const handleSelectClient = (client: CoachClient) => {
    startConversation.mutate({
      recipientUserId: client.user.id,
      bookingId: client.bookingId,
    });
  };

  const getCoachDisplayName = (coach: (typeof coaches)[number]) =>
    coach.profile?.displayName ?? coach.title ?? 'Coach';

  const getCoachAvatarUrl = (coach: (typeof coaches)[number]) =>
    coach.profile?.avatarUrl ?? undefined;

  const getClientDisplayName = (client: CoachClient) =>
    client.user.displayName ?? client.user.email ?? 'Client';

  const getClientAvatarUrl = (client: CoachClient) =>
    client.user.avatarUrl ?? undefined;

  const hasAnyRecipients =
    filteredCoaches.length > 0 ||
    filteredGymPartners.length > 0 ||
    (isCoach && filteredClients.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={triggerSize}
          className={`gap-2 ${triggerClassName ?? ''}`.trim()}
        >
          <Plus className="h-4 w-4" />
          {showLabel ? (
            <span className="hidden sm:inline">New Message</span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogDescription>
            {isCoach
              ? 'Message coaches, your clients, or your gym partners'
              : 'Message any coach or your gym partners'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasAnyRecipients ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
              <p className="font-medium">No recipients found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {filteredCoaches.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    Coaches
                  </p>
                  {filteredCoaches.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => handleSelectCoach(coach.id)}
                      disabled={startConversation.isPending}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Avatar>
                        <AvatarImage
                          src={getCoachAvatarUrl(coach)}
                          alt={getCoachDisplayName(coach)}
                        />
                        <AvatarFallback>
                          {getInitials(getCoachDisplayName(coach))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {getCoachDisplayName(coach)}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          Coach
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isCoach && filteredClients.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    Your Clients
                  </p>
                  {filteredClients.map((client) => (
                    <button
                      key={client.user.id}
                      onClick={() => handleSelectClient(client)}
                      disabled={startConversation.isPending}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Avatar>
                        <AvatarImage
                          src={getClientAvatarUrl(client)}
                          alt={getClientDisplayName(client)}
                        />
                        <AvatarFallback>
                          {getInitials(getClientDisplayName(client))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {getClientDisplayName(client)}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {client.package.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredGymPartners.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    Gym Partners
                  </p>
                  {filteredGymPartners.map((partner) => (
                    <button
                      key={partner.user.id}
                      onClick={() => handleSelectGymPartner(partner.user.id)}
                      disabled={startConversation.isPending}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Avatar>
                        <AvatarImage
                          src={partner.user.avatarUrl ?? undefined}
                          alt={partner.user.displayName ?? 'Gym Partner'}
                        />
                        <AvatarFallback>
                          {getInitials(
                            partner.user.displayName ?? 'Gym Partner',
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {partner.user.displayName ?? 'Gym Partner'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          Gym Partner
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
