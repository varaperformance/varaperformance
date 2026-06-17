import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useGymPartners,
  usePendingPartnerRequests,
  usePartnerSuggestions,
  useSendPartnerRequest,
  useRespondToPartnerRequest,
  useRemovePartner,
  useSearchUsers,
} from '@/features/social';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type {
  GymPartnerResponse,
  GymPartnerSuggestion,
  SearchUserResult,
} from '@varaperformance/core';
import {
  ArrowLeft,
  Check,
  Search,
  Sparkles,
  UserPlus,
  Users,
  X,
  Ban,
  MessageCircle,
  MapPin,
  Send,
} from 'lucide-react';

const DEFAULT_AVATAR =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

type TabId = 'partners' | 'requests' | 'sent' | 'find';

type PartnersContentProps = {
  embedded?: boolean;
};

export function PartnersContent({ embedded = false }: PartnersContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('partners');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [removePartnerId, setRemovePartnerId] = useState<string | null>(null);
  const [removePartnerName, setRemovePartnerName] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fetch data
  const { data: partnersData, isLoading: isLoadingPartners } = useGymPartners({
    status: 'ACCEPTED',
  });
  const { data: pendingData, isLoading: isLoadingPending } =
    usePendingPartnerRequests();
  const { data: suggestionsData, isLoading: isLoadingSuggestions } =
    usePartnerSuggestions();
  const { data: searchData, isLoading: isSearching } =
    useSearchUsers(globalSearch);

  // We need to also fetch sent requests (pending where user is requester)
  const { data: sentData, isLoading: isLoadingSent } = useGymPartners({
    status: 'PENDING',
  });

  // Mutations
  const sendRequest = useSendPartnerRequest({
    onSuccess: () => toast.success('Partner request sent!'),
    onError: (error) => toast.error(error.message || 'Failed to send request'),
  });
  const respondToRequest = useRespondToPartnerRequest({
    onSuccess: () => toast.success('Request updated!'),
    onError: (error) => toast.error(error.message || 'Failed to respond'),
  });
  const removePartner = useRemovePartner({
    onSuccess: () => {
      toast.success('Partner removed');
      setRemovePartnerId(null);
    },
    onError: (error) =>
      toast.error(error.message || 'Failed to remove partner'),
  });

  const partners = partnersData?.success ? partnersData.data.partners : [];
  const pendingRequests = pendingData?.success ? pendingData.data.requests : [];
  const suggestions = suggestionsData?.success
    ? suggestionsData.data.suggestions
    : [];
  const searchResults = searchData?.success ? searchData.data.results : [];
  const sentRequests = sentData?.success
    ? sentData.data.partners.filter((p: GymPartnerResponse) => p.isRequester)
    : [];

  // Filter partners by search
  const filteredPartners = partners.filter(
    (p: GymPartnerResponse) =>
      p.user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.gym?.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredSuggestions = suggestions.filter(
    (s: GymPartnerSuggestion) =>
      s.user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user.gym?.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const tabs = [
    { id: 'partners' as TabId, label: 'My Partners', count: partners.length },
    {
      id: 'requests' as TabId,
      label: 'Requests',
      count: pendingRequests.length,
    },
    { id: 'sent' as TabId, label: 'Sent', count: sentRequests.length },
    { id: 'find' as TabId, label: 'Find Partners', count: suggestions.length },
  ];

  const handleRemovePartner = (partner: GymPartnerResponse) => {
    setRemovePartnerId(partner.user.id);
    setRemovePartnerName(partner.user.displayName || 'this partner');
  };

  const profilePath = (displayName?: string | null, id?: string) =>
    `/elevate/${encodeURIComponent(displayName || id || '')}`;

  const activeTabMeta: Record<TabId, { title: string; subtitle: string }> = {
    partners: {
      title: 'Your partner network',
      subtitle:
        'Manage your current gym partners and keep momentum with your crew.',
    },
    requests: {
      title: 'Incoming requests',
      subtitle: 'Approve, decline, or block new partner requests.',
    },
    sent: {
      title: 'Sent invites',
      subtitle: 'Track invites waiting for a response.',
    },
    find: {
      title: 'Find new partners',
      subtitle: 'Discover members with shared gyms, goals, and connections.',
    },
  };

  const revealClass = cn(
    'transform-gpu transition-all duration-300 ease-out',
    isReady ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
  );

  return (
    <div
      className={cn(
        'w-full space-y-4',
        embedded ? 'py-1' : 'px-4 py-6 md:px-6 md:py-8',
      )}
    >
      {embedded && (
        <Card className="card-elevated border-border/70 bg-card">
          <CardContent className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Elevate Studio
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Partners
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build your training network and manage requests in one place.
              </p>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 p-2.5 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      {!embedded && (
        <div className="mb-6 rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-background to-background p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Elevate Network
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Gym Partners
              </h1>
              <p className="mt-1 text-muted-foreground">
                Connect with training partners at your gym
              </p>
            </div>
            <Link to="/elevate">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Feed
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card
          className={cn('card-elevated border-border/70 bg-card', revealClass)}
          style={{ transitionDelay: '40ms' }}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Partners
              </p>
              <p className="text-2xl font-semibold">{partners.length}</p>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('card-elevated border-border/70 bg-card', revealClass)}
          style={{ transitionDelay: '90ms' }}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Incoming
              </p>
              <p className="text-2xl font-semibold">{pendingRequests.length}</p>
            </div>
            <div className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
              <UserPlus className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn('card-elevated border-border/70 bg-card', revealClass)}
          style={{ transitionDelay: '140ms' }}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Sent
              </p>
              <p className="text-2xl font-semibold">{sentRequests.length}</p>
            </div>
            <div className="rounded-full bg-sky-500/15 p-2 text-sky-600 dark:text-sky-300">
              <Send className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated border-border/70 bg-card">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-base font-semibold">
              {activeTabMeta[activeTab].title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTabMeta[activeTab].subtitle}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search partners by name or gym..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border-border/70 bg-background/80 pl-10"
            />
          </div>

          {/* Tabs */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={activeTab === tab.id}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-transparent bg-background/70 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground',
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge
                      variant={activeTab === tab.id ? 'default' : 'outline'}
                      className="ml-1 h-5 px-1.5 text-xs"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* My Partners Tab */}
        {activeTab === 'partners' && (
          <>
            {isLoadingPartners ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPartners.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No partners found' : 'No gym partners yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Start connecting with people at your gym!'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setActiveTab('find')}>
                      Find Partners
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPartners.map((partner: GymPartnerResponse, index) => (
                  <Card
                    key={partner.id}
                    className={cn(
                      'card-elevated card-hoverable border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                      revealClass,
                    )}
                    style={{ transitionDelay: `${80 + index * 35}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Link
                          to={profilePath(
                            partner.user.displayName,
                            partner.user.id,
                          )}
                        >
                          <img
                            src={partner.user.avatarUrl || DEFAULT_AVATAR}
                            alt={partner.user.displayName || 'Partner'}
                            loading="lazy"
                            decoding="async"
                            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/10"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={profilePath(
                              partner.user.displayName,
                              partner.user.id,
                            )}
                            className="font-semibold hover:text-primary truncate block"
                          >
                            {partner.user.displayName || 'Anonymous'}
                          </Link>
                          {partner.user.gym && (
                            <p className="text-sm text-muted-foreground truncate">
                              {partner.user.gym.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Partners since{' '}
                            {formatDistanceToNow(new Date(partner.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" asChild>
                            <Link to={`/messages?user=${partner.user.id}`}>
                              <MessageCircle className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemovePartner(partner)}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                              />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'requests' && (
          <>
            {isLoadingPending ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No pending requests
                  </h3>
                  <p className="text-muted-foreground">
                    When someone sends you a partner request, it will appear
                    here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request: GymPartnerResponse, index) => (
                  <Card
                    key={request.id}
                    className={cn(
                      'card-elevated border-primary/20 bg-primary/3',
                      revealClass,
                    )}
                    style={{ transitionDelay: `${80 + index * 35}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Link
                          to={profilePath(
                            request.user.displayName,
                            request.user.id,
                          )}
                        >
                          <img
                            src={request.user.avatarUrl || DEFAULT_AVATAR}
                            alt={request.user.displayName || 'User'}
                            loading="lazy"
                            decoding="async"
                            className="h-14 w-14 shrink-0 rounded-full object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={profilePath(
                              request.user.displayName,
                              request.user.id,
                            )}
                            className="font-semibold hover:text-primary truncate block"
                          >
                            {request.user.displayName || 'Anonymous'}
                          </Link>
                          {request.user.gym && (
                            <p className="text-sm text-muted-foreground truncate">
                              {request.user.gym.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent{' '}
                            {formatDistanceToNow(new Date(request.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              respondToRequest.mutate({
                                requestId: request.id,
                                action: 'ACCEPT',
                              })
                            }
                            disabled={respondToRequest.isPending}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              respondToRequest.mutate({
                                requestId: request.id,
                                action: 'REJECT',
                              })
                            }
                            disabled={respondToRequest.isPending}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Decline
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              respondToRequest.mutate({
                                requestId: request.id,
                                action: 'BLOCK',
                              })
                            }
                            disabled={respondToRequest.isPending}
                          >
                            <Ban className="mr-1 h-4 w-4" />
                            Block
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sent Requests Tab */}
        {activeTab === 'sent' && (
          <>
            {isLoadingSent ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sentRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No sent requests
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Partner requests you send will appear here until they're
                    accepted.
                  </p>
                  <Button onClick={() => setActiveTab('find')}>
                    Find Partners
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request: GymPartnerResponse, index) => (
                  <Card
                    key={request.id}
                    className={cn('card-elevated', revealClass)}
                    style={{ transitionDelay: `${80 + index * 35}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Link
                          to={profilePath(
                            request.user.displayName,
                            request.user.id,
                          )}
                        >
                          <img
                            src={request.user.avatarUrl || DEFAULT_AVATAR}
                            alt={request.user.displayName || 'User'}
                            loading="lazy"
                            decoding="async"
                            className="h-14 w-14 shrink-0 rounded-full object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={profilePath(
                              request.user.displayName,
                              request.user.id,
                            )}
                            className="font-semibold hover:text-primary truncate block"
                          >
                            {request.user.displayName || 'Anonymous'}
                          </Link>
                          {request.user.gym && (
                            <p className="text-sm text-muted-foreground truncate">
                              {request.user.gym.name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent{' '}
                            {formatDistanceToNow(new Date(request.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Find Partners Tab */}
        {activeTab === 'find' && (
          <>
            {/* Global Search Section */}
            <Card className="mb-6 border-border/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Search All Users</p>
                    <p className="text-sm text-muted-foreground">
                      Find people by name or email, even outside your gym
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="h-11 rounded-xl border-border/70 bg-background/80 pl-10"
                  />
                </div>
                {globalSearch.length > 0 && globalSearch.length < 2 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Type at least 2 characters to search
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Search Results */}
            {globalSearch.length >= 2 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Search Results
                </h3>
                {isSearching ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center">
                            <Skeleton className="h-20 w-20 rounded-full mb-3" />
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No users found matching "{globalSearch}"
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((result: SearchUserResult, index) => (
                      <Card
                        key={result.user.id}
                        className={cn(
                          'card-elevated card-hoverable border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                          revealClass,
                        )}
                        style={{ transitionDelay: `${80 + index * 30}ms` }}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col items-center text-center">
                            <Link
                              to={profilePath(
                                result.user.displayName,
                                result.user.id,
                              )}
                            >
                              <img
                                src={result.user.avatarUrl || DEFAULT_AVATAR}
                                alt={result.user.displayName || 'User'}
                                loading="lazy"
                                decoding="async"
                                className="h-20 w-20 rounded-full object-cover mb-3 ring-2 ring-primary/10"
                              />
                            </Link>
                            <Link
                              to={profilePath(
                                result.user.displayName,
                                result.user.id,
                              )}
                              className="font-semibold hover:text-primary truncate max-w-full"
                            >
                              {result.user.displayName || 'Anonymous'}
                            </Link>
                            {result.user.gym && (
                              <p className="text-sm text-muted-foreground truncate max-w-full">
                                {result.user.gym.name}
                              </p>
                            )}
                            <div className="flex flex-wrap justify-center gap-1 mt-2">
                              {result.mutualPartners > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {result.mutualPartners} mutual
                                </Badge>
                              )}
                            </div>
                            {result.isPartner ? (
                              <Badge variant="secondary" className="mt-4">
                                Already a Partner
                              </Badge>
                            ) : result.hasPendingRequest ? (
                              <Badge variant="outline" className="mt-4">
                                Request Pending
                              </Badge>
                            ) : (
                              <Button
                                className="mt-4 w-full"
                                onClick={() => {
                                  const userId = result.user.id;
                                  if (!userId || typeof userId !== 'string') {
                                    toast.error('Invalid user data');
                                    return;
                                  }
                                  sendRequest.mutate({ receiverId: userId });
                                }}
                                disabled={sendRequest.isPending}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Partner
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggestions Section */}
            <Card className="mb-6 border-primary/30 bg-linear-to-r from-primary/10 to-background">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">
                      Partner Suggestions
                    </p>
                    <p className="text-sm text-muted-foreground">
                      People who train at your gym and share mutual partners
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoadingSuggestions ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        <Skeleton className="h-20 w-20 rounded-full mb-3" />
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery
                      ? 'No matches found'
                      : 'No suggestions available'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Add gyms to your profile to get partner suggestions from your gym.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSuggestions.map(
                  (suggestion: GymPartnerSuggestion, index) => (
                    <Card
                      key={suggestion.user.id}
                      className={cn(
                        'card-elevated card-hoverable border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                        revealClass,
                      )}
                      style={{ transitionDelay: `${80 + index * 30}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center">
                          <Link
                            to={profilePath(
                              suggestion.user.displayName,
                              suggestion.user.id,
                            )}
                          >
                            <img
                              src={suggestion.user.avatarUrl || DEFAULT_AVATAR}
                              alt={suggestion.user.displayName || 'User'}
                              loading="lazy"
                              decoding="async"
                              className="h-20 w-20 shrink-0 rounded-full object-cover mb-3 ring-2 ring-primary/10"
                            />
                          </Link>
                          <Link
                            to={profilePath(
                              suggestion.user.displayName,
                              suggestion.user.id,
                            )}
                            className="font-semibold hover:text-primary truncate max-w-full"
                          >
                            {suggestion.user.displayName || 'Anonymous'}
                          </Link>
                          {suggestion.user.gym && (
                            <p className="text-sm text-muted-foreground truncate max-w-full">
                              {suggestion.user.gym.name}
                            </p>
                          )}
                          <div className="flex flex-wrap justify-center gap-1 mt-2">
                            {suggestion.sharedGyms.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="mr-1 h-3 w-3" />
                                Same gym
                              </Badge>
                            )}
                            {suggestion.mutualPartners > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {suggestion.mutualPartners} mutual
                              </Badge>
                            )}
                          </div>
                          <Button
                            className="mt-4 w-full"
                            onClick={() =>
                              sendRequest.mutate({
                                receiverId: suggestion.user.id,
                              })
                            }
                            disabled={sendRequest.isPending}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Partner
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Remove Partner Confirmation Dialog */}
      <AlertDialog
        open={!!removePartnerId}
        onOpenChange={() => setRemovePartnerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove gym partner?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removePartnerName} as a gym
              partner? You can always send a new request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removePartnerId) {
                  removePartner.mutate(removePartnerId);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const PartnersPage = () => {
  return <PartnersContent />;
};

export default PartnersPage;
