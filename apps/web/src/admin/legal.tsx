import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  History,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useAdminLegalDocuments,
  useAdminLegalDocument,
  useCreateLegalDocument,
  useCreateLegalDocumentVersion,
  type AdminLegalDocument,
} from '@/hooks/use-admin';
import { api } from '@/lib/api';

const DOCUMENT_TYPES = [
  { value: 'TERMS_OF_SERVICE', label: 'Terms of Service' },
  { value: 'PRIVACY_POLICY', label: 'Privacy Policy' },
  { value: 'MARKETING', label: 'Marketing Consent' },
  { value: 'DATA_PROCESSING', label: 'Data Processing Agreement' },
  { value: 'AI_FEATURES_CONSENT', label: 'AI Features Consent' },
  { value: 'HIPAA_AUTHORIZATION', label: 'HIPAA Authorization' },
  { value: 'DATA_SHARING', label: 'Data Sharing Agreement' },
  { value: 'COOKIES', label: 'Cookie Policy' },
  { value: 'HEALTH_DATA_CONSENT', label: 'Health Data Sharing Agreement' },
  { value: 'SECURITY_POLICY', label: 'Security Policy' },
  { value: 'ACCESSIBILITY_STATEMENT', label: 'Accessibility Statement' },
];

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

export default function LegalManagementPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<AdminLegalDocument | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [versionType, setVersionType] = useState<'major' | 'minor' | 'patch'>(
    'patch',
  );

  // View Dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(
    null,
  );
  const { data: viewingDocument } = useAdminLegalDocument(
    viewingDocumentId || '',
  );

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  // Queries & Mutations
  const { data: documentsData, isLoading } = useAdminLegalDocuments({
    type: typeFilter === 'all' ? undefined : typeFilter,
    page,
    limit: 50,
  });

  const createDocument = useCreateLegalDocument();
  const createVersion = useCreateLegalDocumentVersion();

  const documents = documentsData?.data?.items ?? [];
  const total = documentsData?.data?.total ?? 0;
  const limit = documentsData?.data?.limit ?? 50;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingDocument(null);
    setDocumentType('');
    setDocumentTitle('');
    setDocumentContent('');
    setEffectiveAt('');
    setVersionType('patch');
  };

  const openCreateDialog = () => {
    resetDialog();
    setDialogOpen(true);
  };

  const openEditDialog = async (doc: AdminLegalDocument) => {
    // Fetch full document content
    try {
      const response = await api.get<{
        success: boolean;
        data: AdminLegalDocument;
      }>(`/legal/admin/${doc.id}`);
      const fullDoc = response.data.data;
      setEditingDocument(fullDoc);
      setDocumentType(fullDoc.type);
      setDocumentTitle(fullDoc.title);
      setDocumentContent(fullDoc.content || '');
      setEffectiveAt('');
      setDialogOpen(true);
    } catch {
      // Handle error
    }
  };

  const handleSubmit = () => {
    if (editingDocument) {
      // Creating a new version (WORM compliant)
      createVersion.mutate(
        {
          id: editingDocument.id,
          title: documentTitle,
          content: documentContent,
          effectiveAt: effectiveAt || undefined,
          versionType,
        },
        {
          onSuccess: () => {
            toast.success('New version created successfully');
            resetDialog();
          },
          onError: () => toast.error('Failed to create version'),
        },
      );
    } else {
      // Creating a new document
      createDocument.mutate(
        {
          type: documentType,
          title: documentTitle,
          content: documentContent,
          effectiveAt: effectiveAt || undefined,
        },
        {
          onSuccess: () => {
            toast.success('Document created successfully');
            resetDialog();
          },
          onError: () => toast.error('Failed to create document'),
        },
      );
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    setVerificationResult(null);
    try {
      const response = await api.get<{
        success: boolean;
        data: { isValid: boolean; message: string };
      }>(`/legal/admin/${id}/verify`);
      setVerificationResult(response.data.data);
    } catch {
      setVerificationResult({
        isValid: false,
        message: 'Failed to verify document',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const openViewDialog = (id: string) => {
    setViewingDocumentId(id);
    setViewDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Legal Document Management
          </h1>
          <p className="text-muted-foreground mt-1">
            SOC2/HIPAA compliant document versioning (WORM)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>
                {editingDocument ? (
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Create New Version
                  </div>
                ) : (
                  'Create Legal Document'
                )}
              </DialogTitle>
              <DialogDescription>
                {editingDocument ? (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Lock className="h-4 w-4" />
                    WORM Compliance: This will create a new version. The
                    previous version ({editingDocument.version}) will be
                    preserved for audit trail.
                  </div>
                ) : (
                  'Create a new legal document with content hash for integrity verification'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!editingDocument && (
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingDocument && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Document Type:
                        </span>
                        <p className="font-medium">
                          {getTypeLabel(editingDocument.type)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Current Version:
                        </span>
                        <p className="font-medium">{editingDocument.version}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Current Hash:
                        </span>
                        <p className="font-mono text-xs break-all">
                          {editingDocument.hashValue}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g., Terms of Service"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown supported)</Label>
                <Textarea
                  id="content"
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Enter the legal document content..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveAt">Effective Date (optional)</Label>
                <Input
                  id="effectiveAt"
                  type="datetime-local"
                  value={effectiveAt}
                  onChange={(e) => setEffectiveAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use current date/time
                </p>
              </div>

              {editingDocument && (
                <div className="space-y-2">
                  <Label>Version Increment Type</Label>
                  <Select
                    value={versionType}
                    onValueChange={(v) =>
                      setVersionType(v as 'major' | 'minor' | 'patch')
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

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !documentTitle ||
                  !documentContent ||
                  (!editingDocument && !documentType) ||
                  createDocument.isPending ||
                  createVersion.isPending
                }
              >
                {createDocument.isPending || createVersion.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingDocument ? (
                  <>
                    <History className="mr-2 h-4 w-4" />
                    Create Version
                  </>
                ) : (
                  'Create Document'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* WORM Compliance Notice */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-amber-600" />
            WORM Compliance (SOC2/HIPAA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This system implements Write Once Read Many (WORM) storage for legal
            documents. Editing a document creates a new version - previous
            versions are <strong>never modified or deleted</strong>. Each
            version includes a SHA-256 content hash for tamper detection.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {total} document{total !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Verification Result Toast */}
      {verificationResult && (
        <Card
          className={
            verificationResult.isValid
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-red-500/50 bg-red-500/5'
          }
        >
          <CardContent className="flex items-center gap-3 py-3">
            {verificationResult.isValid ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-600" />
            )}
            <span
              className={
                verificationResult.isValid ? 'text-green-700' : 'text-red-700'
              }
            >
              {verificationResult.message}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setVerificationResult(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No Documents Found</h3>
              <p className="text-sm text-muted-foreground">
                Create your first legal document to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hash (SHA-256)</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(doc.type)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doc.version}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">
                        {doc.hashValue
                          ? `${doc.hashValue.substring(0, 16)}...`
                          : 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(doc.effectiveAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openViewDialog(doc.id)}
                          title="View content"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(doc)}
                          title="Create new version"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerify(doc.id)}
                          disabled={verifyingId === doc.id}
                          title="Verify integrity"
                        >
                          {verifyingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
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
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
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
      )}

      {/* View Document Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.data?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {viewingDocument?.data &&
                    getTypeLabel(viewingDocument.data.type)}
                </Badge>
                <Badge variant="secondary">
                  {viewingDocument?.data?.version}
                </Badge>
                {viewingDocument?.data?.isActive ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Archived</Badge>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Effective Date:
                    </span>
                    <span className="ml-2">
                      {viewingDocument?.data?.effectiveAt &&
                        format(
                          new Date(viewingDocument.data.effectiveAt),
                          "MMMM d, yyyy 'at' h:mm a",
                        )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Content Hash (SHA-256):
                    </span>
                    <code className="ml-2 text-xs break-all">
                      {viewingDocument?.data?.hashValue}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {viewingDocument?.data?.content}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (viewingDocument?.data) {
                  openEditDialog(viewingDocument.data);
                  setViewDialogOpen(false);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Create New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
