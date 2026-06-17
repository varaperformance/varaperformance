import React, { useState } from 'react';
import { writeClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useCoachContracts,
  useCoachContractById,
  useContractVersionHistory,
  useCreateContract,
  useCreateContractVersion,
  useVerifyContractIntegrity,
} from '@/features/coaching';
import {
  FileText,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Shield,
  Copy,
  Loader2,
} from 'lucide-react';
import type {
  CoachContractListItem,
  ContractVersionType,
} from '@varaperformance/core';

// Version type options for semantic versioning
const VERSION_TYPES = [
  {
    value: 'patch',
    label: 'Patch (v1.0.0 → v1.0.1)',
    description: 'Typos, clarifications, minor corrections',
  },
  {
    value: 'minor',
    label: 'Minor (v1.0.0 → v1.1.0)',
    description: 'New sections, content additions',
  },
  {
    value: 'major',
    label: 'Major (v1.0.0 → v2.0.0)',
    description: 'Breaking changes, complete rewrites',
  },
];

// Format date helper
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Copy to clipboard button
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await writeClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted transition-colors group"
      title={`Copy ${label || text}`}
    >
      {copied ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
      )}
    </button>
  );
}

// Contract list view
function ContractList({
  contracts,
  isLoading,
  onSelect,
}: {
  contracts: CoachContractListItem[];
  isLoading: boolean;
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No contracts yet</h3>
        <p className="text-muted-foreground mt-2">
          Create your first coaching contract to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Effective Date</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow
            key={contract.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelect(contract.id)}
          >
            <TableCell className="font-medium">{contract.title}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono">
                {contract.version}
              </Badge>
            </TableCell>
            <TableCell>
              {contract.isActive ? (
                <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
              )}
            </TableCell>
            <TableCell>{formatDate(contract.effectiveAt)}</TableCell>
            <TableCell>{formatDate(contract.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Contract detail view
function ContractDetail({
  contractId,
  onBack,
}: {
  contractId: string;
  onBack: () => void;
}) {
  const isMobile = useIsMobile();
  const { data: contractData, isLoading } = useCoachContractById(contractId);
  const {
    data: integrityData,
    isLoading: isVerifying,
    refetch: verifyIntegrity,
  } = useVerifyContractIntegrity(contractId);
  const createVersionMutation = useCreateContractVersion();

  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionType, setVersionType] = useState<ContractVersionType>('patch');
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');

  const contract = contractData?.data;

  const handleCreateVersion = async () => {
    if (!newContent.trim()) {
      toast.error('Contract content is required');
      return;
    }

    try {
      await createVersionMutation.mutateAsync({
        id: contractId,
        data: {
          content: newContent,
          versionType,
          title: newTitle || undefined,
          cancellationPolicy: cancellationPolicy || undefined,
          refundPolicy: refundPolicy || undefined,
        },
      });
      toast.success('New contract version has been created successfully.');
      setShowVersionDialog(false);
      setNewContent('');
      setNewTitle('');
      setCancellationPolicy('');
      setRefundPolicy('');
    } catch {
      toast.error('Failed to create new version');
    }
  };

  if (isLoading || !contract) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{contract.title}</h2>
              {contract.isActive ? (
                <Badge className="bg-green-500/10 text-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Archived</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Badge variant="outline" className="font-mono">
                {contract.version}
              </Badge>
              <span>·</span>
              <span>Effective {formatDate(contract.effectiveAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => verifyIntegrity()}
            disabled={isVerifying}
            className={
              integrityData?.data
                ? integrityData.data.isValid
                  ? 'border-green-500 text-green-500 hover:bg-green-500/10'
                  : 'border-red-500 text-red-500 hover:bg-red-500/10'
                : ''
            }
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : integrityData?.data?.isValid ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : integrityData?.data ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            {integrityData?.data
              ? integrityData.data.isValid
                ? 'Verified'
                : 'Invalid'
              : 'Verify Integrity'}
          </Button>
          <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setNewContent(contract.content);
                  setNewTitle(contract.title);
                  setCancellationPolicy(contract.cancellationPolicy || '');
                  setRefundPolicy(contract.refundPolicy || '');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Version</DialogTitle>
                <DialogDescription>
                  Create a new version of this contract. The previous version
                  will be preserved for audit trail.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contract title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contract Content *</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Enter the full contract text..."
                    className="min-h-50 font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cancellation Policy</Label>
                  <Textarea
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value)}
                    placeholder="Describe the cancellation policy..."
                    className="min-h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Refund Policy</Label>
                  <Textarea
                    value={refundPolicy}
                    onChange={(e) => setRefundPolicy(e.target.value)}
                    placeholder="Describe the refund policy..."
                    className="min-h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Version Increment Type</Label>
                  <Select
                    value={versionType}
                    onValueChange={(v) =>
                      setVersionType(v as ContractVersionType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select version type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VERSION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {type.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the type of change for semantic versioning
                    (vMAJOR.MINOR.PATCH)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowVersionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateVersion}
                  disabled={createVersionMutation.isPending}
                >
                  {createVersionMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Version
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Contract content */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm">
                {contract.content}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cancellation Policy</CardTitle>
              </CardHeader>
              <CardContent>
                {contract.cancellationPolicy ? (
                  <p className="text-sm">{contract.cancellationPolicy}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No cancellation policy defined
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Refund Policy</CardTitle>
              </CardHeader>
              <CardContent>
                {contract.refundPolicy ? (
                  <p className="text-sm">{contract.refundPolicy}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No refund policy defined
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="metadata" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <dl
                className={cn(
                  'grid gap-4 text-sm',
                  isMobile ? 'grid-cols-1' : 'grid-cols-2',
                )}
              >
                <div>
                  <dt className="text-muted-foreground">Contract ID</dt>
                  <dd className="font-mono flex items-center gap-1">
                    {contract.id}
                    <CopyButton text={contract.id} label="Contract ID" />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="font-mono">{contract.version}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Hash Value</dt>
                  <dd className="font-mono text-xs flex items-center gap-1 truncate">
                    {contract.hashValue || 'N/A'}
                    {contract.hashValue && (
                      <CopyButton text={contract.hashValue} label="Hash" />
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Effective Date</dt>
                  <dd>{formatDate(contract.effectiveAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{formatDate(contract.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd>{formatDate(contract.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Version history dialog
function VersionHistoryDialog() {
  const { data, isLoading } = useContractVersionHistory();
  const versions = data?.data || [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contract Version History</DialogTitle>
          <DialogDescription>
            Complete audit trail of all contract versions (WORM compliant)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-100 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No version history available
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {version.version}
                      </Badge>
                    </TableCell>
                    <TableCell>{version.title}</TableCell>
                    <TableCell>
                      {version.isActive ? (
                        <Badge className="bg-green-500/10 text-green-500">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(version.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create contract dialog
function CreateContractDialog({
  existingContract,
}: {
  existingContract?: CoachContractListItem;
}) {
  const createMutation = useCreateContract();
  const createVersionMutation = useCreateContractVersion();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [versionType, setVersionType] = useState<ContractVersionType>('patch');
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  const isUpdate = !!existingContract;

  // Fetch full contract data when dialog opens for update
  const { data: fullContractData } = useCoachContractById(
    open && isUpdate ? existingContract.id : null,
  );

  // Pre-populate form when full contract data is loaded
  React.useEffect(() => {
    if (open && isUpdate && fullContractData?.data) {
      const contract = fullContractData.data;
      setTitle(contract.title || '');
      setContent(contract.content || '');
      setCancellationPolicy(contract.cancellationPolicy || '');
      setRefundPolicy(contract.refundPolicy || '');
      setIsLoadingContract(false);
    } else if (open && isUpdate) {
      setIsLoadingContract(true);
    }
  }, [open, isUpdate, fullContractData]);

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTitle('');
      setContent('');
      setCancellationPolicy('');
      setRefundPolicy('');
      setVersionType('patch');
      setIsLoadingContract(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    try {
      if (isUpdate) {
        // Create new version of existing contract
        await createVersionMutation.mutateAsync({
          id: existingContract.id,
          data: {
            title,
            content,
            versionType,
            cancellationPolicy: cancellationPolicy || undefined,
            refundPolicy: refundPolicy || undefined,
          },
        });
        toast.success('New contract version created successfully');
      } else {
        // Create initial contract
        await createMutation.mutateAsync({
          title,
          content,
          cancellationPolicy: cancellationPolicy || undefined,
          refundPolicy: refundPolicy || undefined,
        });
        toast.success('Your coaching contract has been created as v1.0.0');
      }
      handleOpenChange(false);
    } catch {
      toast.error(
        isUpdate ? 'Failed to create new version' : 'Failed to create contract',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {isUpdate ? 'Update Contract' : 'Create Contract'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isUpdate ? 'Create New Version' : 'Create New Contract'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? `Create a new version of your contract. Current version: ${existingContract.version}`
              : 'Create your coaching contract. This will be version v1.0.0.'}
          </DialogDescription>
        </DialogHeader>
        {isLoadingContract ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Coaching Agreement"
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Content *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the full contract text..."
                className="min-h-50 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Cancellation Policy</Label>
              <Textarea
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                placeholder="Describe the cancellation policy..."
                className="min-h-20"
              />
            </div>
            <div className="space-y-2">
              <Label>Refund Policy</Label>
              <Textarea
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                placeholder="Describe the refund policy..."
                className="min-h-20"
              />
            </div>
            {isUpdate && (
              <div className="space-y-2">
                <Label>Version Increment Type</Label>
                <Select
                  value={versionType}
                  onValueChange={(v) =>
                    setVersionType(v as ContractVersionType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {type.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the type of change for semantic versioning
                  (vMAJOR.MINOR.PATCH)
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              isLoadingContract ||
              createMutation.isPending ||
              createVersionMutation.isPending
            }
          >
            {(createMutation.isPending || createVersionMutation.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isUpdate ? 'Create Version' : 'Create Contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main page component
export default function CoachContractsPage() {
  const isMobile = useIsMobile();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const { data, isLoading } = useCoachContracts();
  const contracts = data?.data?.items || [];

  // Find the active contract (coaches have one contract that gets versioned)
  const activeContract = contracts.find((c) => c.isActive);

  // Show detail view if a contract is selected
  if (selectedContractId) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
        <ContractDetail
          contractId={selectedContractId}
          onBack={() => setSelectedContractId(null)}
        />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Coach Legal
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Contracts
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage coaching agreements with WORM-compliant versioning and
              audit history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <VersionHistoryDialog />
            <CreateContractDialog existingContract={activeContract} />
          </div>
        </div>
      </section>

      <div
        className={cn(
          'grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
          !isMobile && 'sm:grid-cols-3',
        )}
      >
        <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{contracts.length}</div>
            <p className="text-xs text-muted-foreground">Total Contracts</p>
          </CardContent>
        </Card>
        <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">
              {contracts.filter((c) => c.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">
              {contracts.filter((c) => !c.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted/70">
        <CardHeader>
          <CardTitle>Your Contracts</CardTitle>
          <CardDescription>
            Click on a contract to view details and create new versions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractList
            contracts={contracts}
            isLoading={isLoading}
            onSelect={setSelectedContractId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
