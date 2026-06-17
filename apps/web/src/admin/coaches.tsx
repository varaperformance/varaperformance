import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Search,
  Check,
  X,
  Star,
  StarOff,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  Clock,
  Award,
  MapPin,
  Mail,
  Trash2,
  Eye,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import {
  useAdminCoaches,
  useApproveCoach,
  useDeleteCoach,
  useRejectCoach,
  useToggleCoachFeatured,
  type AdminCoach,
} from '@/hooks/use-admin';
import { Textarea } from '@/components/ui/textarea';

export default function CoachManagementPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // View Details Dialog
  const [viewingCoach, setViewingCoach] = useState<AdminCoach | null>(null);

  // Reject Dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingCoach, setRejectingCoach] = useState<AdminCoach | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Approve Confirmation
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvingCoach, setApprovingCoach] = useState<AdminCoach | null>(null);

  // Delete Confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCoach, setDeletingCoach] = useState<AdminCoach | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Queries & Mutations
  const { data: coachesData, isLoading } = useAdminCoaches({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  // Separate query for stats (all coaches, no status filter)
  const { data: allCoachesData } = useAdminCoaches({
    status: undefined,
    page: 1,
    limit: 1000, // Get all for accurate stats
  });

  const approveCoach = useApproveCoach();
  const rejectCoach = useRejectCoach();
  const deleteCoach = useDeleteCoach();
  const toggleFeatured = useToggleCoachFeatured();

  const coaches = coachesData?.data?.items ?? [];
  const allCoaches = allCoachesData?.data?.items ?? [];
  const total = coachesData?.data?.total ?? 0;
  const limit = coachesData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  // Filter by search locally (since API doesn't support search yet)
  const filteredCoaches = debouncedSearch
    ? coaches.filter(
        (c: AdminCoach) =>
          c.user.profile?.displayName
            ?.toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          c.user.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.title.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : coaches;

  const handleApprove = () => {
    if (approvingCoach) {
      approveCoach.mutate(approvingCoach.id, {
        onSuccess: () => {
          setApproveDialogOpen(false);
          setApprovingCoach(null);
        },
      });
    }
  };

  const handleReject = () => {
    if (rejectingCoach) {
      rejectCoach.mutate(
        { id: rejectingCoach.id, reason: rejectReason || undefined },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setRejectingCoach(null);
            setRejectReason('');
          },
        },
      );
    }
  };

  const handleDelete = () => {
    if (deletingCoach) {
      deleteCoach.mutate(deletingCoach.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingCoach(null);
          if (viewingCoach?.id === deletingCoach.id) {
            setViewingCoach(null);
          }
        },
      });
    }
  };

  const getInitials = (coach: AdminCoach) => {
    const name = coach.user.profile?.displayName || coach.user.email;
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDesignationBadge = (designation: AdminCoach['designation']) => {
    if (designation === 'INFLUENCER') {
      return {
        label: 'Influencer',
        className: 'bg-orange-100 text-orange-700',
      };
    }
    return { label: 'Certified', className: 'bg-blue-100 text-blue-700' };
  };

  const getCoachEvidence = (coach: AdminCoach) => {
    const evidence = coach.certificationEvidence;
    if (Array.isArray(evidence)) {
      return evidence;
    }

    if (evidence && typeof evidence === 'object') {
      const rawCerts = (evidence as Record<string, unknown>).certifications;
      if (Array.isArray(rawCerts)) {
        return rawCerts as Array<{
          name: string;
          lookupUrl?: string;
          photoUrl?: string;
          certId?: string;
        }>;
      }
    }

    return [];
  };

  const getInfluencerLinks = (coach: AdminCoach) => {
    if (Array.isArray(coach.influencerSocialLinks)) {
      return coach.influencerSocialLinks;
    }

    const evidence = coach.certificationEvidence;
    if (evidence && typeof evidence === 'object' && !Array.isArray(evidence)) {
      const rawLinks = (evidence as Record<string, unknown>)
        .influencerSocialLinks;
      if (Array.isArray(rawLinks)) {
        return rawLinks.filter(
          (link): link is string => typeof link === 'string',
        );
      }
    }

    return [];
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Coach Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review applications and manage coach accounts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCoaches.filter((c: AdminCoach) => !c.isVerified).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCoaches.filter((c: AdminCoach) => c.isVerified).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCoaches.filter((c: AdminCoach) => c.isFeatured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allCoaches.reduce(
                (sum: number, c: AdminCoach) => sum + c.clientCount,
                0,
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search coaches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="verified">Verified</TabsTrigger>
                <TabsTrigger value="featured">Featured</TabsTrigger>
                <TabsTrigger value="">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCoaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="mb-4 h-12 w-12" />
              <p>No coaches found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coach</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoaches.map((coach: AdminCoach) => (
                  <TableRow key={coach.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={coach.user.profile?.avatarUrl ?? undefined}
                          />
                          <AvatarFallback>{getInitials(coach)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {coach.user.profile?.displayName || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {coach.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate">
                        {coach.title}
                      </div>
                    </TableCell>
                    <TableCell>{coach.experienceYears} years</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={coach.isVerified ? 'default' : 'secondary'}
                        >
                          {coach.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            getDesignationBadge(coach.designation).className
                          }
                        >
                          {getDesignationBadge(coach.designation).label}
                        </Badge>
                        {coach.isFeatured && (
                          <Badge variant="outline" className="w-fit">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{Number(coach.rating).toFixed(1)}</span>
                        <span className="text-muted-foreground">
                          ({coach.reviewCount})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{coach.clientCount}</TableCell>
                    <TableCell>
                      {format(new Date(coach.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!coach.isVerified ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => {
                                setApprovingCoach(coach);
                                setApproveDialogOpen(true);
                              }}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setRejectingCoach(coach);
                                setRejectDialogOpen(true);
                              }}
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFeatured.mutate(coach.id)}
                              title={coach.isFeatured ? 'Unfeature' : 'Feature'}
                            >
                              {coach.isFeatured ? (
                                <StarOff className="h-4 w-4" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setRejectingCoach(coach);
                                setRejectDialogOpen(true);
                              }}
                              title="Revoke verification"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingCoach(coach)}
                          aria-label={`View ${coach.user.profile?.displayName || coach.user.email}`}
                          title={`View ${coach.user.profile?.displayName || coach.user.email}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setDeletingCoach(coach);
                            setDeleteDialogOpen(true);
                          }}
                          title="Delete coach"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{' '}
            of {total} coaches
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Coach Details Dialog */}
      <Dialog open={!!viewingCoach} onOpenChange={() => setViewingCoach(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Coach Details</DialogTitle>
          </DialogHeader>
          {viewingCoach && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={viewingCoach.user.profile?.avatarUrl ?? undefined}
                  />
                  <AvatarFallback className="text-lg">
                    {getInitials(viewingCoach)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {viewingCoach.user.profile?.displayName || 'No name'}
                  </h3>
                  <p className="text-muted-foreground">{viewingCoach.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant={
                        viewingCoach.isVerified ? 'default' : 'secondary'
                      }
                    >
                      {viewingCoach.isVerified ? 'Verified' : 'Pending Review'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        getDesignationBadge(viewingCoach.designation).className
                      }
                    >
                      {getDesignationBadge(viewingCoach.designation).label}
                    </Badge>
                    {viewingCoach.isFeatured && (
                      <Badge variant="outline">Featured</Badge>
                    )}
                    {viewingCoach.isAvailable && (
                      <Badge variant="outline" className="text-green-600">
                        Available
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingCoach.user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingCoach.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingCoach.experienceYears} years experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{viewingCoach.clientCount} clients</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h4 className="mb-2 font-medium">Bio</h4>
                <p className="text-sm text-muted-foreground">
                  {viewingCoach.bio}
                </p>
              </div>

              {/* Specialties */}
              <div>
                <h4 className="mb-2 font-medium">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingCoach.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty.charAt(0) + specialty.slice(1).toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h4 className="mb-2 font-medium">Certifications</h4>
                {viewingCoach.certifications.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingCoach.certifications.map((cert) => (
                      <Badge key={cert} variant="secondary">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No certifications submitted.
                  </p>
                )}
              </div>

              {getInfluencerLinks(viewingCoach).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Influencer Social Links</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {getInfluencerLinks(viewingCoach).map((link, index) => (
                      <a
                        key={`${link}-${index}`}
                        className="block text-primary underline"
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {getCoachEvidence(viewingCoach).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Certification Evidence</h4>
                  {getCoachEvidence(viewingCoach).map((evidence, index) => (
                    <div
                      key={`${evidence.name}-${index}`}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <p className="font-medium">{evidence.name}</p>
                      <div className="mt-2 space-y-1 text-muted-foreground">
                        {evidence.certId && <p>ID: {evidence.certId}</p>}
                        {evidence.lookupUrl && (
                          <p>
                            Lookup:{' '}
                            <a
                              className="text-primary underline"
                              href={evidence.lookupUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {evidence.lookupUrl}
                            </a>
                          </p>
                        )}
                        {evidence.photoUrl && (
                          <div className="space-y-2">
                            <a
                              className="inline-block"
                              href={evidence.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={evidence.photoUrl}
                                alt={`Certification evidence for ${evidence.name}`}
                                className="h-32 w-auto rounded-md border object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </a>
                            <p>
                              Photo:{' '}
                              <a
                                className="text-primary underline"
                                href={evidence.photoUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View uploaded certificate
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold">
                        {Number(viewingCoach.rating).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {viewingCoach.reviewCount} reviews
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {viewingCoach.clientCount}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total clients
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {format(new Date(viewingCoach.createdAt), 'MMM yyyy')}
                    </div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingCoach(null)}>
              Close
            </Button>
            {viewingCoach && !viewingCoach.isVerified && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectingCoach(viewingCoach);
                    setRejectDialogOpen(true);
                    setViewingCoach(null);
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setApprovingCoach(viewingCoach);
                    setApproveDialogOpen(true);
                    setViewingCoach(null);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Coach Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve{' '}
              {approvingCoach?.user.profile?.displayName ||
                approvingCoach?.user.email}
              ? They will be granted the Coach role and can start accepting
              clients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>
              {approveCoach.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectingCoach?.isVerified
                ? 'Revoke Verification'
                : 'Reject Application'}
            </DialogTitle>
            <DialogDescription>
              {rejectingCoach?.isVerified
                ? `This will revoke verification for ${rejectingCoach?.user.profile?.displayName || rejectingCoach?.user.email}.`
                : `Reject the coach application for ${rejectingCoach?.user.profile?.displayName || rejectingCoach?.user.email}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingCoach(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {rejectCoach.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : rejectingCoach?.isVerified ? (
                'Revoke'
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coach</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              {deletingCoach?.user.profile?.displayName ||
                deletingCoach?.user.email}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCoach.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
