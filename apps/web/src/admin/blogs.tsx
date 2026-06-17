import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import {
  EditorContent,
  useEditor,
  type Editor as TiptapEditor,
} from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table as TipTapTable } from '@tiptap/extension-table';
import TipTapTableRow from '@tiptap/extension-table-row';
import TipTapTableHeader from '@tiptap/extension-table-header';
import TipTapTableCell from '@tiptap/extension-table-cell';
import CharacterCount from '@tiptap/extension-character-count';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { common, createLowlight } from 'lowlight';
import 'highlight.js/styles/github-dark.css';
import './blogs-editor.css';
import { CreateBlogSchema } from '@varaperformance/core';
import {
  useAdminBlogs,
  useAdminCategories,
  useDeleteBlog,
  type AdminBlog,
  type AdminCategory,
} from '@/hooks/use-admin';
import { type ApiBlog, type ApiBlogResponse } from '@/features/blog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Upload,
  ClipboardPaste,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Code2,
  Link2,
  ImagePlus,
  Minus,
  Undo2,
  Redo2,
  Edit,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  ExternalLink,
  Save,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Check,
  Table2,
  ListTodo,
  Search,
  Replace,
  Trash2,
  Keyboard,
  Command,
  GripVertical,
  ArrowUpDown,
  ArrowLeftRight,
  Eraser,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import api from '@/lib/api';
import { toast } from 'sonner';

const statusColors = {
  DRAFT: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  PUBLISHED: 'bg-green-500/10 text-green-600 border-green-500/20',
  ARCHIVED: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-yellow-500/10 text-yellow-600' },
  {
    value: 'PUBLISHED',
    label: 'Published',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    value: 'ARCHIVED',
    label: 'Archived',
    color: 'bg-gray-500/10 text-gray-600',
  },
] as const;

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormErrors {
  [key: string]: string;
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.use(gfm);

marked.setOptions({
  gfm: true,
  breaks: false,
});

function normalizeMarkdown(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function normalizeTableCellText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
}

function tableElementToMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  const matrix = rows.map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) =>
      normalizeTableCellText(cell.textContent ?? ''),
    ),
  );

  const columnCount = Math.max(...matrix.map((cells) => cells.length), 1);
  const padded = matrix.map((cells) => {
    const next = [...cells];
    while (next.length < columnCount) {
      next.push('');
    }
    return next;
  });

  const hasExplicitHeader =
    table.querySelector('thead') !== null ||
    Array.from(rows[0].querySelectorAll('th')).length > 0;

  const header = hasExplicitHeader ? padded[0] : Array(columnCount).fill('');
  const bodyRows = hasExplicitHeader ? padded.slice(1) : padded;

  const headerLine = `| ${header.join(' | ')} |`;
  const separatorLine = `| ${Array(columnCount).fill('---').join(' | ')} |`;
  const bodyLines = bodyRows.map((cells) => `| ${cells.join(' | ')} |`);

  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function markdownToHtml(markdown: string): string {
  return DOMPurify.sanitize(marked.parse(markdown || '') as string);
}

function htmlToMarkdown(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html || '';

  const tableReplacements = new Map<string, string>();
  let tableIndex = 0;

  container.querySelectorAll('table').forEach((tableNode) => {
    const tableMarkdown = tableElementToMarkdown(tableNode as HTMLTableElement);
    if (!tableMarkdown) return;

    const token = `TBLMDTOKEN${tableIndex++}`;
    tableReplacements.set(token, tableMarkdown);

    const marker = document.createElement('p');
    marker.textContent = token;
    tableNode.replaceWith(marker);
  });

  let markdown = normalizeMarkdown(turndown.turndown(container.innerHTML));
  for (const [token, tableMarkdown] of tableReplacements.entries()) {
    markdown = markdown.replace(token, `\n${tableMarkdown}\n`);
  }

  return normalizeMarkdown(markdown);
}

const lowlight = createLowlight(common);

const CODE_LANGUAGES = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'tsx', label: 'TSX' },
  { value: 'jsx', label: 'JSX' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
] as const;

const SLASH_COMMANDS = [
  { id: 'heading-2', label: 'Heading 2', keywords: ['h2', 'title'] },
  { id: 'heading-3', label: 'Heading 3', keywords: ['h3', 'subtitle'] },
  { id: 'bullet-list', label: 'Bullet List', keywords: ['ul', 'list'] },
  { id: 'ordered-list', label: 'Numbered List', keywords: ['ol', 'list'] },
  { id: 'task-list', label: 'Task List', keywords: ['todo', 'checklist'] },
  { id: 'blockquote', label: 'Quote', keywords: ['blockquote', 'quote'] },
  { id: 'code-block', label: 'Code Block', keywords: ['code', 'snippet'] },
  { id: 'table', label: 'Table', keywords: ['grid', 'columns'] },
  { id: 'divider', label: 'Divider', keywords: ['hr', 'line'] },
  { id: 'image', label: 'Image', keywords: ['photo', 'upload'] },
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== Blog List Component ====================
function BlogList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [blogToDelete, setBlogToDelete] = useState<AdminBlog | null>(null);

  const { data: blogsData, isLoading } = useAdminBlogs({
    page,
    limit: 20,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const deleteBlog = useDeleteBlog();

  const blogs: AdminBlog[] = blogsData?.data?.items ?? [];
  const totalPages = blogsData?.data?.totalPages ?? 1;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage blog posts
          </p>
        </div>
        <Button onClick={() => navigate('/admin/blogs/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Blogs Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No blog posts found</h3>
              <p className="text-sm text-muted-foreground">
                Create your first blog post to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate('/admin/blogs/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-25">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogs.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {blog.featured && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="font-medium max-w-62.5 truncate">
                            {blog.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {blog.category ? (
                          <Badge variant="outline">{blog.category.name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {blog.author?.profile?.displayName ?? 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'border',
                            statusColors[
                              blog.status as keyof typeof statusColors
                            ],
                          )}
                        >
                          {blog.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(blog.createdAt), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(blog.updatedAt), 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/blog/${blog.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              navigate(`/admin/blogs/${blog.slug}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setBlogToDelete(blog)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!blogToDelete}
        onOpenChange={(open) => {
          if (!open) setBlogToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete blog post?</DialogTitle>
            <DialogDescription>
              <strong>&ldquo;{blogToDelete?.title}&rdquo;</strong> will be
              permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlogToDelete(null)}
              disabled={deleteBlog.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBlog.isPending}
              onClick={() => {
                if (!blogToDelete) return;
                deleteBlog.mutate(blogToDelete.slug, {
                  onSuccess: () => {
                    toast.success('Blog post deleted');
                    setBlogToDelete(null);
                  },
                  onError: () => {
                    toast.error('Failed to delete blog post');
                  },
                });
              }}
            >
              {deleteBlog.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Blog Editor Component ====================
function BlogEditor({ editSlug }: { editSlug?: string }) {
  const navigate = useNavigate();
  const isEditing = !!editSlug;

  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoadingBlog, setIsLoadingBlog] = useState(false);
  const [originalBlog, setOriginalBlog] = useState<ApiBlog | null>(null);

  // Fetch categories from API
  const { data: categoriesData } = useAdminCategories({ limit: 100 });
  const categories = useMemo<AdminCategory[]>(
    () => categoriesData?.data?.items ?? [],
    [categoriesData?.data?.items],
  );

  // Form state
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState(`## Introduction

Write your blog content here using **Markdown**.

### Features

- Supports headers, lists, and code blocks
- Live preview as you type
- Syntax highlighting for code

\`\`\`typescript
const greeting = "Hello, World!";
return greeting;
\`\`\`
`);
  const [coverImage, setCoverImage] = useState('');
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [isDragOverCoverImage, setIsDragOverCoverImage] = useState(false);
  const coverDropzoneRef = useRef<HTMLDivElement | null>(null);
  const [readTime, setReadTime] = useState('5 min read');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>(
    'DRAFT',
  );
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'source'>('wysiwyg');
  const [pasteMode, setPasteMode] = useState<'keep' | 'plain'>('keep');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('https://');
  const [isImageCaptionPopoverOpen, setIsImageCaptionPopoverOpen] =
    useState(false);
  const [imageCaptionInputValue, setImageCaptionInputValue] = useState('');
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [slashQuery, setSlashQuery] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [slashMenuPosition, setSlashMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [selectionMenuPosition, setSelectionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [sourceFindQuery, setSourceFindQuery] = useState('');
  const [sourceReplaceValue, setSourceReplaceValue] = useState('');
  const [sourceFindMatches, setSourceFindMatches] = useState(0);
  const [lastAutosaveAt, setLastAutosaveAt] = useState<string | null>(null);
  const [hasAutosavedDraft, setHasAutosavedDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  // Slug validation state
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');
  const editorImageInputRef = useRef<HTMLInputElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sourceFindInputRef = useRef<HTMLInputElement | null>(null);
  const sourceReplaceInputRef = useRef<HTMLInputElement | null>(null);
  const commandPaletteInputRef = useRef<HTMLInputElement | null>(null);
  const editorSurfaceRef = useRef<HTMLDivElement | null>(null);
  const selectedEditorImageRef = useRef<HTMLImageElement | null>(null);
  const hasInitializedSnapshotRef = useRef(false);
  const savedSnapshotRef = useRef('');

  // Generate slug from title
  const slugify = useCallback((text: string) => {
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }, []);

  // Derived slug from title
  const slug = useMemo(() => slugify(title), [title, slugify]);
  const draftStorageKey = useMemo(
    () => `admin-blog-draft:${editSlug ?? 'new'}`,
    [editSlug],
  );
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        title,
        excerpt,
        content,
        coverImage,
        readTime,
        featured,
        status,
        categoryId,
        tags,
      }),
    [
      title,
      excerpt,
      content,
      coverImage,
      readTime,
      featured,
      status,
      categoryId,
      tags,
    ],
  );

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || (isEditing && originalBlog && slug === originalBlog.slug))
      return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setSlugStatus('checking');
      (async () => {
        try {
          const response = await api.get<{
            success: boolean;
            data: { slugTaken: boolean };
          }>(`blogs/slug/${slug}`, { signal: controller.signal });
          if (!controller.signal.aborted) {
            setSlugStatus(response.data.data.slugTaken ? 'taken' : 'available');
          }
        } catch {
          if (!controller.signal.aborted) {
            setSlugStatus('idle');
          }
        }
      })();
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [slug, isEditing, originalBlog]);

  // Load existing blog data when editing
  useEffect(() => {
    if (!editSlug) return;

    setIsLoadingBlog(true);
    (async () => {
      try {
        const response = await api.get<ApiBlogResponse>(`blogs/${editSlug}`);
        const blog = response.data.data;
        setOriginalBlog(blog);

        // Populate form with existing data
        setTitle(blog.title);
        setExcerpt(blog.excerpt);
        setContent(blog.content);
        setCoverImage(blog.coverImage);
        setReadTime(blog.readTime);
        setFeatured(blog.featured);
        setStatus(blog.status);
        setTags(blog.tags.map((t) => t.name));
      } catch {
        setServerError('Failed to load blog post for editing');
      } finally {
        setIsLoadingBlog(false);
      }
    })();
  }, [editSlug]);

  useEffect(() => {
    if (isLoadingBlog) return;

    if (!hasInitializedSnapshotRef.current) {
      savedSnapshotRef.current = currentSnapshot;
      hasInitializedSnapshotRef.current = true;
      setIsDirty(false);
      return;
    }

    setIsDirty(currentSnapshot !== savedSnapshotRef.current);
  }, [currentSnapshot, isLoadingBlog]);

  useEffect(() => {
    const existing = localStorage.getItem(draftStorageKey);
    if (!existing) {
      setHasAutosavedDraft(false);
      setLastAutosaveAt(null);
      return;
    }

    setHasAutosavedDraft(true);
    try {
      const parsed = JSON.parse(existing) as { updatedAt?: string };
      setLastAutosaveAt(parsed.updatedAt ?? null);
    } catch {
      setLastAutosaveAt(null);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!hasInitializedSnapshotRef.current || !isDirty) return;

    const timeoutId = window.setTimeout(() => {
      const payload = {
        title,
        excerpt,
        content,
        coverImage,
        readTime,
        featured,
        status,
        categoryId,
        tags,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      setHasAutosavedDraft(true);
      setLastAutosaveAt(payload.updatedAt);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    isDirty,
    draftStorageKey,
    title,
    excerpt,
    content,
    coverImage,
    readTime,
    featured,
    status,
    categoryId,
    tags,
  ]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!showCommandPalette) {
      setCommandPaletteQuery('');
      return;
    }

    window.requestAnimationFrame(() => {
      commandPaletteInputRef.current?.focus();
    });
  }, [showCommandPalette]);

  useEffect(() => {
    if (!sourceFindQuery.trim()) {
      setSourceFindMatches(0);
      return;
    }

    const needle = sourceFindQuery.toLowerCase();
    const haystack = content.toLowerCase();
    const matches = haystack.match(new RegExp(escapeRegExp(needle), 'g'));
    setSourceFindMatches(matches?.length ?? 0);
  }, [content, sourceFindQuery]);

  const clearAutosavedDraft = useCallback(() => {
    localStorage.removeItem(draftStorageKey);
    setHasAutosavedDraft(false);
    setLastAutosaveAt(null);
  }, [draftStorageKey]);

  const restoreAutosavedDraft = useCallback(() => {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        title?: string;
        excerpt?: string;
        content?: string;
        coverImage?: string;
        readTime?: string;
        featured?: boolean;
        status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
        categoryId?: string;
        tags?: string[];
      };

      if (typeof parsed.title === 'string') setTitle(parsed.title);
      if (typeof parsed.excerpt === 'string') setExcerpt(parsed.excerpt);
      if (typeof parsed.content === 'string') setContent(parsed.content);
      if (typeof parsed.coverImage === 'string')
        setCoverImage(parsed.coverImage);
      if (typeof parsed.readTime === 'string') setReadTime(parsed.readTime);
      if (typeof parsed.featured === 'boolean') setFeatured(parsed.featured);
      if (parsed.status) setStatus(parsed.status);
      if (typeof parsed.categoryId === 'string')
        setCategoryId(parsed.categoryId);
      if (Array.isArray(parsed.tags)) setTags(parsed.tags);
    } catch {
      setServerError('Could not restore autosaved draft.');
    }
  }, [draftStorageKey]);

  const uploadBlogImageFile = useCallback(async (inputFile: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(inputFile.type)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP');
    }

    if (inputFile.size > 10 * 1024 * 1024) {
      throw new Error('File too large. Maximum 10MB');
    }

    const formData = new FormData();
    formData.append('file', inputFile);

    const response = await api.post<{
      success: boolean;
      data: { url: string };
    }>('blogs/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.data.url;
  }, []);

  const uploadEditorImage = useCallback(
    async (blob: Blob | File) => {
      const file =
        blob instanceof File
          ? blob
          : new File([blob], `blog-inline-${Date.now()}.png`, {
              type: blob.type || 'image/png',
            });

      const url = await uploadBlogImageFile(file);
      return { url, name: file.name };
    },
    [uploadBlogImageFile],
  );

  const syncSelectedImageState = useCallback(
    (currentEditor: TiptapEditor) => {
      if (selectedEditorImageRef.current) {
        selectedEditorImageRef.current.classList.remove(
          'blog-editor-image-selected',
        );
        selectedEditorImageRef.current = null;
      }

      const selection = currentEditor.state.selection;
      const selectedImageNode =
        selection instanceof NodeSelection &&
        selection.node.type.name === 'image'
          ? selection.node
          : null;

      setIsImageSelected(Boolean(selectedImageNode));

      if (!selectedImageNode) {
        setIsImageCaptionPopoverOpen(false);
        return;
      }

      const nodeDom = currentEditor.view.nodeDOM(selection.from);
      let imageElement: HTMLImageElement | null =
        nodeDom instanceof HTMLImageElement
          ? nodeDom
          : nodeDom instanceof HTMLElement
            ? nodeDom.querySelector('img')
            : null;

      if (!imageElement) {
        const selectedSrc = selectedImageNode.attrs.src as string | undefined;
        if (selectedSrc) {
          imageElement =
            Array.from(currentEditor.view.dom.querySelectorAll('img')).find(
              (img) => img.getAttribute('src') === selectedSrc,
            ) ?? null;
        }
      }

      if (imageElement) {
        imageElement.classList.add('blog-editor-image-selected');
        selectedEditorImageRef.current = imageElement;
      }

      if (!isImageCaptionPopoverOpen) {
        setImageCaptionInputValue(
          (selectedImageNode.attrs.alt as string) || '',
        );
      }
    },
    [isImageCaptionPopoverOpen],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TipTapTable.configure({
        resizable: true,
      }),
      TipTapTableRow,
      TipTapTableHeader,
      TipTapTableCell,
      CharacterCount,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https'],
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Start writing your article...' }),
    ],
    content: markdownToHtml(content),
    editorProps: {
      attributes: {
        class:
          'blog-editor-content prose prose-invert max-w-none focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const imageItem = Array.from(event.clipboardData?.items || []).find(
          (item) => item.type.startsWith('image/'),
        );

        if (!imageItem) {
          if (pasteMode === 'plain') {
            const plainText = event.clipboardData?.getData('text/plain') || '';
            if (plainText) {
              event.preventDefault();
              editor?.chain().focus().insertContent(plainText).run();
              return true;
            }
          }
          return false;
        }

        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return true;

        void (async () => {
          try {
            const uploaded = await uploadEditorImage(file);
            editor
              ?.chain()
              .focus()
              .setImage({ src: uploaded.url, alt: '' })
              .run();
          } catch (error) {
            setServerError(
              error instanceof Error
                ? error.message
                : 'Failed to upload inline image.',
            );
          }
        })();

        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.metaKey || event.ctrlKey) {
          if (event.key.toLowerCase() === 'k') {
            event.preventDefault();
            setShowCommandPalette(true);
            return true;
          }
        }

        if (!showSlashCommands) return false;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedSlashIndex((prev) =>
            Math.min(prev + 1, Math.max(filteredSlashCommands.length - 1, 0)),
          );
          return true;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedSlashIndex((prev) => Math.max(prev - 1, 0));
          return true;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          const selected = filteredSlashCommands[selectedSlashIndex];
          if (selected) {
            executeSlashCommand(selected.id);
          }
          return true;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          setShowSlashCommands(false);
          return true;
        }

        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return false;

        event.preventDefault();
        void (async () => {
          try {
            const uploaded = await uploadEditorImage(file);
            editor
              ?.chain()
              .focus()
              .setImage({ src: uploaded.url, alt: '' })
              .run();
          } catch (error) {
            setServerError(
              error instanceof Error
                ? error.message
                : 'Failed to upload inline image.',
            );
          }
        })();

        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = htmlToMarkdown(currentEditor.getHTML());
      setContent(markdown);

      if (currentEditor.isActive('paragraph')) {
        const parentText =
          currentEditor.state.selection.$from.parent.textContent;
        const slashMatch = parentText.match(/^\/([\w-]*)$/);

        if (slashMatch) {
          setSlashQuery(slashMatch[1] ?? '');
          setShowSlashCommands(true);
          setSelectedSlashIndex(0);

          const coords = currentEditor.view.coordsAtPos(
            currentEditor.state.selection.from,
          );
          const containerRect =
            editorSurfaceRef.current?.getBoundingClientRect();
          if (containerRect) {
            setSlashMenuPosition({
              top: coords.bottom - containerRect.top + 6,
              left: Math.max(10, coords.left - containerRect.left),
            });
          }
        } else {
          setSlashQuery('');
          setShowSlashCommands(false);
          setSlashMenuPosition(null);
        }
      } else {
        setSlashQuery('');
        setShowSlashCommands(false);
        setSlashMenuPosition(null);
      }

      const { from, to } = currentEditor.state.selection;
      if (from !== to) {
        const start = currentEditor.view.coordsAtPos(from);
        const end = currentEditor.view.coordsAtPos(to);
        const containerRect = editorSurfaceRef.current?.getBoundingClientRect();
        if (containerRect) {
          setSelectionMenuPosition({
            top: Math.max(
              10,
              Math.min(start.top, end.top) - containerRect.top - 40,
            ),
            left: Math.max(
              10,
              Math.min(
                containerRect.width - 180,
                (start.left + end.left) / 2 - containerRect.left - 80,
              ),
            ),
          });
        }
      } else {
        setSelectionMenuPosition(null);
      }

      syncSelectedImageState(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      if (from !== to) {
        const start = currentEditor.view.coordsAtPos(from);
        const end = currentEditor.view.coordsAtPos(to);
        const containerRect = editorSurfaceRef.current?.getBoundingClientRect();
        if (containerRect) {
          setSelectionMenuPosition({
            top: Math.max(
              10,
              Math.min(start.top, end.top) - containerRect.top - 40,
            ),
            left: Math.max(
              10,
              Math.min(
                containerRect.width - 180,
                (start.left + end.left) / 2 - containerRect.left - 80,
              ),
            ),
          });
        }
      } else {
        setSelectionMenuPosition(null);
      }

      syncSelectedImageState(currentEditor);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const currentMarkdown = htmlToMarkdown(editor.getHTML());
    const nextMarkdown = normalizeMarkdown(content);
    if (currentMarkdown !== nextMarkdown) {
      editor.commands.setContent(markdownToHtml(nextMarkdown), {
        emitUpdate: false,
      });
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (selectedEditorImageRef.current) {
        selectedEditorImageRef.current.classList.remove(
          'blog-editor-image-selected',
        );
        selectedEditorImageRef.current = null;
      }
    };
  }, []);

  const sourceLineCount = useMemo(() => {
    const lines = content.split('\n').length;
    return Math.max(1, lines);
  }, [content]);
  const filteredSlashCommands = useMemo(() => {
    if (!slashQuery.trim()) return SLASH_COMMANDS;

    const query = slashQuery.toLowerCase();
    return SLASH_COMMANDS.filter(
      (command) =>
        command.label.toLowerCase().includes(query) ||
        command.keywords.some((keyword) => keyword.includes(query)),
    );
  }, [slashQuery]);
  const runEditorCommand = (commandId: string) => {
    if (!editor) return;

    switch (commandId) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'list-bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'list-numbered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'task-list':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code-block':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'insert-table':
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
        break;
      case 'insert-image':
        pickInlineImage();
        break;
      case 'set-link':
        setLinkInputValue(
          (editor.getAttributes('link').href as string) || 'https://',
        );
        setIsLinkPopoverOpen(true);
        break;
      case 'source-mode':
        changeEditorMode('source');
        break;
      case 'wysiwyg-mode':
        changeEditorMode('wysiwyg');
        break;
      default:
        break;
    }
  };
  const commandPaletteItems = useMemo(
    () => [
      { id: 'bold', label: 'Bold', shortcut: 'Cmd/Ctrl+B' },
      { id: 'italic', label: 'Italic', shortcut: 'Cmd/Ctrl+I' },
      { id: 'h2', label: 'Heading 2', shortcut: '' },
      { id: 'h3', label: 'Heading 3', shortcut: '' },
      { id: 'list-bullet', label: 'Bullet list', shortcut: '' },
      { id: 'list-numbered', label: 'Numbered list', shortcut: '' },
      { id: 'task-list', label: 'Task list', shortcut: '' },
      { id: 'code-block', label: 'Code block', shortcut: '' },
      { id: 'insert-table', label: 'Insert table', shortcut: '' },
      { id: 'insert-image', label: 'Insert image', shortcut: '' },
      { id: 'set-link', label: 'Set link', shortcut: 'Cmd/Ctrl+K' },
      { id: 'source-mode', label: 'Switch to source mode', shortcut: '' },
      { id: 'wysiwyg-mode', label: 'Switch to WYSIWYG mode', shortcut: '' },
    ],
    [],
  );
  const filteredCommandItems = useMemo(() => {
    const query = commandPaletteQuery.trim().toLowerCase();
    if (!query) return commandPaletteItems;
    return commandPaletteItems.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [commandPaletteItems, commandPaletteQuery]);

  useEffect(() => {
    setSelectedSlashIndex((prev) =>
      Math.min(prev, Math.max(filteredSlashCommands.length - 1, 0)),
    );
  }, [filteredSlashCommands.length]);

  const contentCharacters =
    editor?.storage.characterCount?.characters() ?? content.length;
  const contentWords =
    editor?.storage.characterCount?.words() ??
    content.trim().split(/\s+/).filter(Boolean).length;

  // Set category ID once both blog and categories are loaded
  useEffect(() => {
    if (originalBlog && categories.length > 0 && !categoryId) {
      const category = categories.find(
        (c) => c.slug === originalBlog.category.slug,
      );
      if (category) setCategoryId(category.id);
    }
  }, [originalBlog, categories, categoryId]);

  // Calculate estimated read time based on content
  const estimateReadTime = () => {
    const words = content.split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 200);
    setReadTime(`${minutes} min read`);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (title.length > 255)
      newErrors.title = 'Title must be under 255 characters';
    // Only check slug availability for new posts or if slug changed during edit
    const isSlugChanged =
      isEditing && originalBlog && slug !== originalBlog.slug;
    if (slugStatus === 'taken' && (!isEditing || isSlugChanged)) {
      newErrors.title = "This title generates a slug that's already taken";
    }
    if (!excerpt.trim()) newErrors.excerpt = 'Excerpt is required';
    if (excerpt.length > 500)
      newErrors.excerpt = 'Excerpt must be under 500 characters';
    if (!content.trim()) newErrors.content = 'Content is required';
    if (!coverImage.trim()) newErrors.coverImage = 'Cover image is required';
    if (!categoryId) newErrors.categoryId = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    setFormStatus('submitting');

    try {
      const blogData = {
        title: title.trim(),
        slug: slug || undefined,
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImage: coverImage.trim(),
        readTime,
        featured,
        status,
        categoryId,
        tags: tags.length > 0 ? tags : undefined,
        publishedAt:
          status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      };

      if (isEditing && originalBlog) {
        // Update existing blog
        await api.patch(`blogs/${originalBlog.slug}`, blogData);
      } else {
        // Create new blog - validate with Zod schema
        const validated = CreateBlogSchema.parse(blogData);
        await api.post('blogs/create', validated);
      }
      setFormStatus('success');
      savedSnapshotRef.current = currentSnapshot;
      setIsDirty(false);
      clearAutosavedDraft();

      // Redirect after success
      setTimeout(() => navigate('/admin/blogs'), 1500);
    } catch (error) {
      setFormStatus('error');
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError(
          isEditing
            ? 'Failed to update blog post. Please try again.'
            : 'Failed to create blog post. Please try again.',
        );
      }
    }
  };

  const uploadCoverImage = async (file: File) => {
    if (!file) return;

    setIsUploadingCoverImage(true);
    setServerError(null);

    try {
      const uploadedUrl = await uploadBlogImageFile(file);
      setCoverImage(uploadedUrl);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.coverImage;
        return next;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload image. Please try again.';
      setErrors((prev) => ({
        ...prev,
        coverImage: message,
      }));
    } finally {
      setIsUploadingCoverImage(false);
    }
  };

  const openLinkPopover = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href as string | undefined;
    setLinkInputValue(previousUrl || 'https://');
    setIsLinkPopoverOpen(true);
  };

  const applyLinkFromPopover = () => {
    if (!editor) return;
    const url = linkInputValue.trim();

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      setIsLinkPopoverOpen(false);
      return;
    }

    editor.chain().focus().setLink({ href: url.trim() }).run();

    setIsLinkPopoverOpen(false);
  };

  const removeLinkFromPopover = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setIsLinkPopoverOpen(false);
  };

  const openImageCaptionPopover = () => {
    if (!editor || !editor.isActive('image')) {
      setServerError('Select an image in the editor to edit its caption.');
      return;
    }

    setServerError(null);
    setImageCaptionInputValue(
      (editor.getAttributes('image').alt as string) || '',
    );
    setIsImageCaptionPopoverOpen(true);
  };

  const applyImageCaptionFromPopover = () => {
    if (!editor || !editor.isActive('image')) return;

    editor
      .chain()
      .focus()
      .updateAttributes('image', { alt: imageCaptionInputValue.trim() })
      .run();
    setIsImageCaptionPopoverOpen(false);
  };

  const applyInlineImageCaption = () => {
    if (!editor || !editor.isActive('image')) return;

    editor
      .chain()
      .focus()
      .updateAttributes('image', { alt: imageCaptionInputValue.trim() })
      .run();
  };

  const clearInlineImageCaption = () => {
    setImageCaptionInputValue('');
    if (!editor || !editor.isActive('image')) return;

    editor.chain().focus().updateAttributes('image', { alt: '' }).run();
  };

  const setCodeLanguage = (language: string) => {
    if (!editor || !editor.isActive('codeBlock')) return;

    editor
      .chain()
      .focus()
      .updateAttributes('codeBlock', {
        language: language === 'plaintext' ? null : language,
      })
      .run();
  };

  const changeEditorMode = (mode: 'wysiwyg' | 'source') => {
    if (mode === editorMode) return;

    if (mode === 'source' && editor) {
      setContent(htmlToMarkdown(editor.getHTML()));
    }

    if (mode === 'wysiwyg' && editor) {
      const nextMarkdown = normalizeMarkdown(content);
      editor.commands.setContent(markdownToHtml(nextMarkdown), {
        emitUpdate: false,
      });
    }

    setEditorMode(mode);
  };

  const executeSlashCommand = (
    commandId: (typeof SLASH_COMMANDS)[number]['id'],
  ) => {
    if (!editor) return;

    const selection = editor.state.selection;
    const parentText = selection.$from.parent.textContent;
    if (/^\/[\w-]*$/.test(parentText)) {
      const start = selection.from - selection.$from.parentOffset;
      editor
        .chain()
        .focus()
        .deleteRange({ from: start, to: start + parentText.length })
        .run();
    }

    const slashToCommandMap: Record<
      (typeof SLASH_COMMANDS)[number]['id'],
      string
    > = {
      'heading-2': 'h2',
      'heading-3': 'h3',
      'bullet-list': 'list-bullet',
      'ordered-list': 'list-numbered',
      'task-list': 'task-list',
      blockquote: 'blockquote',
      'code-block': 'code-block',
      table: 'insert-table',
      divider: 'divider',
      image: 'insert-image',
    };

    const mappedCommand = slashToCommandMap[commandId];
    if (mappedCommand === 'divider') {
      editor.chain().focus().setHorizontalRule().run();
    } else {
      runEditorCommand(mappedCommand);
    }

    setShowSlashCommands(false);
    setSlashQuery('');
  };

  const findNextInSource = () => {
    const needle = sourceFindQuery.trim();
    if (!needle) return;

    const textarea = sourceTextareaRef.current;
    if (!textarea) return;

    const haystack = textarea.value.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let index = haystack.indexOf(lowerNeedle, textarea.selectionEnd);

    if (index === -1) {
      index = haystack.indexOf(lowerNeedle, 0);
    }

    if (index === -1) return;

    textarea.focus();
    textarea.setSelectionRange(index, index + needle.length);
  };

  const replaceNextInSource = () => {
    const needle = sourceFindQuery.trim();
    if (!needle) return;

    const textarea = sourceTextareaRef.current;
    if (!textarea) return;

    const selection = textarea.value.slice(
      textarea.selectionStart,
      textarea.selectionEnd,
    );

    if (selection.toLowerCase() !== needle.toLowerCase()) {
      findNextInSource();
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue =
      textarea.value.slice(0, start) +
      sourceReplaceValue +
      textarea.value.slice(end);

    setContent(nextValue);

    window.requestAnimationFrame(() => {
      const nextStart = start;
      const nextEnd = start + sourceReplaceValue.length;
      textarea.focus();
      textarea.setSelectionRange(nextStart, nextEnd);
    });
  };

  const replaceAllInSource = () => {
    const needle = sourceFindQuery.trim();
    if (!needle) return;

    const nextValue = content.replace(
      new RegExp(escapeRegExp(needle), 'gi'),
      sourceReplaceValue,
    );
    setContent(nextValue);
  };

  const handleSourceEditorKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!(event.metaKey || event.ctrlKey)) return;

    const key = event.key.toLowerCase();
    if (key === 'f') {
      event.preventDefault();
      sourceFindInputRef.current?.focus();
      sourceFindInputRef.current?.select();
      return;
    }

    if (key === 'h') {
      event.preventDefault();
      sourceReplaceInputRef.current?.focus();
      sourceReplaceInputRef.current?.select();
    }
  };

  const handleBackNavigation = () => {
    if (isDirty) {
      setShowLeaveWarning(true);
      return;
    }

    navigate('/admin/blogs');
  };

  const pickInlineImage = () => {
    if (editorImageInputRef.current) {
      editorImageInputRef.current.value = '';
      editorImageInputRef.current.click();
    }
  };

  const onInlineImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0];
    if (!file || !editor) {
      event.currentTarget.value = '';
      return;
    }

    try {
      const uploaded = await uploadEditorImage(file);
      editor.chain().focus().setImage({ src: uploaded.url, alt: '' }).run();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : 'Failed to upload inline image.',
      );
    } finally {
      event.currentTarget.value = '';
    }
  };

  const handlePasteCoverImage = async (
    event: React.ClipboardEvent<HTMLDivElement>,
  ) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/'),
    );

    if (!imageItem) return;

    event.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    await uploadCoverImage(file);
  };

  const handleDropCoverImage = async (
    event: React.DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsDragOverCoverImage(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await uploadCoverImage(file);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackNavigation}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">
              {isEditing ? 'Edit Blog Post' : 'Create Blog Post'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                STATUS_OPTIONS.find((s) => s.value === status)?.color,
              )}
            >
              {STATUS_OPTIONS.find((s) => s.value === status)?.label}
            </Badge>
            <Button
              onClick={handleSubmit}
              disabled={formStatus === 'submitting' || isLoadingBlog}
              className="min-w-25"
            >
              {formStatus === 'submitting' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : formStatus === 'success' ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {formStatus === 'submitting'
                ? 'Saving...'
                : formStatus === 'success'
                  ? 'Saved!'
                  : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      {/* Server Error Alert */}
      {serverError && (
        <div className="container mt-4">
          <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{serverError}</p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 w-8 p-0"
              onClick={() => setServerError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showLeaveWarning && (
        <div className="container mt-4">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              You have unsaved changes. Leave without saving?
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveWarning(false)}
              >
                Stay
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => navigate('/admin/blogs')}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
        <DialogContent className="max-w-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Keyboard className="h-4 w-4" />
              Command Palette
            </DialogTitle>
            <DialogDescription>
              Jump to editor actions quickly. Shortcut: Cmd/Ctrl+K
            </DialogDescription>
          </DialogHeader>
          <Input
            ref={commandPaletteInputRef}
            value={commandPaletteQuery}
            onChange={(event) => setCommandPaletteQuery(event.target.value)}
            placeholder="Type an action..."
          />
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
            {filteredCommandItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  runEditorCommand(item.id);
                  setShowCommandPalette(false);
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground">
                    {item.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container py-8">
        {isLoadingBlog ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">
              Loading blog post...
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-8 lg:grid-cols-[1fr_320px]"
          >
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <div className="relative">
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a compelling title..."
                    className={cn(
                      'text-lg pr-10',
                      errors.title && 'border-destructive',
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {slugStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {slugStatus === 'available' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {slugStatus === 'taken' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Slug:{' '}
                    <code className="rounded bg-muted px-1 py-0.5">
                      {slug || '—'}
                    </code>
                    {slugStatus === 'available' && (
                      <span className="ml-2 text-green-500">Available</span>
                    )}
                    {slugStatus === 'taken' && (
                      <span className="ml-2 text-destructive">
                        Already taken
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {title.length}/255 characters
                  </p>
                </div>
              </div>

              {/* Excerpt */}
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Write a brief summary that appears in blog listings..."
                  rows={3}
                  className={cn(
                    'w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
                    'placeholder:text-muted-foreground',
                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                    errors.excerpt && 'border-destructive',
                  )}
                />
                {errors.excerpt && (
                  <p className="text-sm text-destructive">{errors.excerpt}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {excerpt.length}/500 characters
                </p>
              </div>

              {/* Content Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Content</Label>
                  <div className="flex items-center gap-2">
                    {hasAutosavedDraft && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={restoreAutosavedDraft}
                      >
                        Restore autosave
                      </Button>
                    )}
                    <div className="inline-flex rounded-md border p-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          editorMode === 'wysiwyg' ? 'secondary' : 'ghost'
                        }
                        onClick={() => changeEditorMode('wysiwyg')}
                      >
                        WYSIWYG
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          editorMode === 'source' ? 'secondary' : 'ghost'
                        }
                        onClick={() => changeEditorMode('source')}
                      >
                        Source
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={estimateReadTime}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Estimate read time
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Open command palette (Cmd/Ctrl+K)"
                      aria-label="Open command palette"
                      onClick={() => setShowCommandPalette(true)}
                    >
                      <Command className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div
                  ref={editorSurfaceRef}
                  className={cn(
                    'blog-rich-editor relative overflow-hidden rounded-md border',
                    isImageSelected && 'blog-image-selection-active',
                    errors.content && 'ring-2 ring-destructive rounded-md',
                  )}
                >
                  {editorMode === 'wysiwyg' ? (
                    <>
                      <div className="blog-editor-toolbar flex flex-wrap items-center gap-1 border-b bg-card/95 p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('heading', { level: 2 }) &&
                              'bg-muted',
                          )}
                          onClick={() =>
                            editor
                              ?.chain()
                              .focus()
                              .toggleHeading({ level: 2 })
                              .run()
                          }
                        >
                          <Heading2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('heading', { level: 3 }) &&
                              'bg-muted',
                          )}
                          onClick={() =>
                            editor
                              ?.chain()
                              .focus()
                              .toggleHeading({ level: 3 })
                              .run()
                          }
                        >
                          <Heading3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(editor?.isActive('bold') && 'bg-muted')}
                          onClick={() =>
                            editor?.chain().focus().toggleBold().run()
                          }
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('italic') && 'bg-muted',
                          )}
                          onClick={() =>
                            editor?.chain().focus().toggleItalic().run()
                          }
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('bulletList') && 'bg-muted',
                          )}
                          onClick={() =>
                            editor?.chain().focus().toggleBulletList().run()
                          }
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('orderedList') && 'bg-muted',
                          )}
                          onClick={() =>
                            editor?.chain().focus().toggleOrderedList().run()
                          }
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('taskList') && 'bg-muted',
                          )}
                          onClick={() =>
                            editor?.chain().focus().toggleTaskList().run()
                          }
                        >
                          <ListTodo className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('blockquote') && 'bg-muted',
                          )}
                          onClick={() =>
                            editor?.chain().focus().toggleBlockquote().run()
                          }
                        >
                          <Quote className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('codeBlock') && 'bg-muted',
                          )}
                          onClick={() =>
                            editor?.chain().focus().toggleCodeBlock().run()
                          }
                        >
                          <Code2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Move between table cells"
                          aria-label="Move between table cells"
                          onClick={() =>
                            editor?.chain().focus().goToNextCell().run()
                          }
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            editor?.isActive('table') && 'bg-muted',
                          )}
                          title="Insert table"
                          aria-label="Insert table"
                          onClick={() =>
                            editor
                              ?.chain()
                              .focus()
                              .insertTable({
                                rows: 3,
                                cols: 3,
                                withHeaderRow: true,
                              })
                              .run()
                          }
                        >
                          <Table2 className="h-4 w-4" />
                        </Button>
                        {editor?.isActive('codeBlock') && (
                          <select
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                            value={
                              (editor.getAttributes('codeBlock')
                                .language as string) || 'plaintext'
                            }
                            onChange={(event) =>
                              setCodeLanguage(event.target.value)
                            }
                          >
                            {CODE_LANGUAGES.map((lang) => (
                              <option key={lang.value} value={lang.value}>
                                {lang.label}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            editor?.chain().focus().setHorizontalRule().run()
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Popover
                          open={isLinkPopoverOpen}
                          onOpenChange={setIsLinkPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                editor?.isActive('link') && 'bg-muted',
                              )}
                              onClick={openLinkPopover}
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <Label htmlFor="editor-link-input">
                                Link URL
                              </Label>
                              <Input
                                id="editor-link-input"
                                value={linkInputValue}
                                onChange={(event) =>
                                  setLinkInputValue(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    applyLinkFromPopover();
                                  }
                                }}
                                placeholder="https://example.com"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={removeLinkFromPopover}
                                >
                                  Remove
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={applyLinkFromPopover}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={pickInlineImage}
                        >
                          <ImagePlus className="h-4 w-4" />
                        </Button>
                        <Popover
                          open={isImageCaptionPopoverOpen}
                          onOpenChange={setIsImageCaptionPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={cn(
                                editor?.isActive('image') && 'bg-muted',
                              )}
                              title="Edit image caption"
                              aria-label="Edit image caption"
                              onClick={openImageCaptionPopover}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <Label htmlFor="editor-image-caption-input">
                                Image caption
                              </Label>
                              <Input
                                id="editor-image-caption-input"
                                value={imageCaptionInputValue}
                                onChange={(event) =>
                                  setImageCaptionInputValue(event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    applyImageCaptionFromPopover();
                                  }
                                }}
                                placeholder="Add a caption"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setIsImageCaptionPopoverOpen(false)
                                  }
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={applyImageCaptionFromPopover}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => editor?.chain().focus().undo().run()}
                          disabled={!editor?.can().chain().focus().undo().run()}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={
                            pasteMode === 'plain' ? 'secondary' : 'ghost'
                          }
                          size="icon"
                          title={
                            pasteMode === 'plain'
                              ? 'Paste mode: Plain text'
                              : 'Paste mode: Keep formatting'
                          }
                          aria-label="Toggle paste mode"
                          onClick={() =>
                            setPasteMode((prev) =>
                              prev === 'keep' ? 'plain' : 'keep',
                            )
                          }
                        >
                          <Eraser className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => editor?.chain().focus().redo().run()}
                          disabled={!editor?.can().chain().focus().redo().run()}
                        >
                          <Redo2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {editor?.isActive('table') && (
                        <div className="blog-table-actions flex flex-wrap items-center gap-1 border-b bg-muted/30 p-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Move to previous row"
                            aria-label="Move to previous row"
                            onClick={() =>
                              editor.chain().focus().goToPreviousCell().run()
                            }
                          >
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Add row below"
                            aria-label="Add row below"
                            onClick={() =>
                              editor.chain().focus().addRowAfter().run()
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Delete current row"
                            aria-label="Delete current row"
                            onClick={() =>
                              editor.chain().focus().deleteRow().run()
                            }
                            disabled={
                              !editor.can().chain().focus().deleteRow().run()
                            }
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <div className="mx-1 h-5 w-px bg-border" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Move between columns"
                            aria-label="Move between columns"
                            onClick={() =>
                              editor.chain().focus().goToNextCell().run()
                            }
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Add column left"
                            aria-label="Add column left"
                            onClick={() =>
                              editor.chain().focus().addColumnBefore().run()
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Add column right"
                            aria-label="Add column right"
                            onClick={() =>
                              editor.chain().focus().addColumnAfter().run()
                            }
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Delete current column"
                            aria-label="Delete current column"
                            onClick={() =>
                              editor.chain().focus().deleteColumn().run()
                            }
                            disabled={
                              !editor.can().chain().focus().deleteColumn().run()
                            }
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <div className="mx-1 h-5 w-px bg-border" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete table"
                            aria-label="Delete table"
                            onClick={() =>
                              editor.chain().focus().deleteTable().run()
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {isImageSelected && (
                        <div className="blog-image-caption-panel flex flex-wrap items-center gap-2 border-b bg-primary/5 p-2">
                          <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                            Image selected
                          </span>
                          <div className="min-w-56 flex-1">
                            <Input
                              value={imageCaptionInputValue}
                              onChange={(event) =>
                                setImageCaptionInputValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  applyInlineImageCaption();
                                }
                              }}
                              placeholder="Set image caption (figcaption)"
                              className="h-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={applyInlineImageCaption}
                          >
                            Apply caption
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearInlineImageCaption}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                      {showSlashCommands && slashMenuPosition && (
                        <div
                          className="absolute z-30 w-56 rounded-md border bg-popover p-1 shadow-xl"
                          style={{
                            top: slashMenuPosition.top,
                            left: slashMenuPosition.left,
                          }}
                        >
                          {filteredSlashCommands
                            .slice(0, 8)
                            .map((command, index) => (
                              <button
                                key={command.id}
                                type="button"
                                className={cn(
                                  'w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted',
                                  index === selectedSlashIndex && 'bg-muted',
                                )}
                                onMouseEnter={() =>
                                  setSelectedSlashIndex(index)
                                }
                                onClick={() => executeSlashCommand(command.id)}
                              >
                                {command.label}
                              </button>
                            ))}
                        </div>
                      )}
                      {editor && selectionMenuPosition && (
                        <div
                          className="absolute z-30 flex items-center gap-1 rounded-md border bg-popover p-1 shadow-lg"
                          style={{
                            top: selectionMenuPosition.top,
                            left: selectionMenuPosition.left,
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              editor.isActive('bold') && 'bg-muted',
                            )}
                            onClick={() =>
                              editor.chain().focus().toggleBold().run()
                            }
                          >
                            <Bold className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              editor.isActive('italic') && 'bg-muted',
                            )}
                            onClick={() =>
                              editor.chain().focus().toggleItalic().run()
                            }
                          >
                            <Italic className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              editor.isActive('link') && 'bg-muted',
                            )}
                            onClick={openLinkPopover}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      <EditorContent editor={editor} />
                    </>
                  ) : (
                    <div className="blog-source-editor">
                      <div className="blog-source-findbar border-b bg-card/95 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative min-w-42 flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              ref={sourceFindInputRef}
                              value={sourceFindQuery}
                              onChange={(event) =>
                                setSourceFindQuery(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  findNextInSource();
                                }
                              }}
                              placeholder="Find"
                              className="h-8 pl-8"
                            />
                          </div>
                          <div className="relative min-w-42 flex-1">
                            <Replace className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              ref={sourceReplaceInputRef}
                              value={sourceReplaceValue}
                              onChange={(event) =>
                                setSourceReplaceValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  replaceNextInSource();
                                }
                              }}
                              placeholder="Replace"
                              className="h-8 pl-8"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={findNextInSource}
                          >
                            Find next
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={replaceNextInSource}
                          >
                            Replace
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={replaceAllInSource}
                          >
                            Replace all
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {sourceFindMatches} match
                            {sourceFindMatches === 1 ? '' : 'es'}
                          </span>
                        </div>
                      </div>
                      <div className="blog-source-gutter" aria-hidden="true">
                        {Array.from(
                          { length: sourceLineCount },
                          (_, i) => i + 1,
                        ).map((lineNumber) => (
                          <div key={lineNumber}>{lineNumber}</div>
                        ))}
                      </div>
                      <textarea
                        ref={sourceTextareaRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onKeyDown={handleSourceEditorKeyDown}
                        className="blog-source-textarea"
                        spellCheck={false}
                        aria-label="Markdown source editor"
                      />
                    </div>
                  )}
                  <input
                    ref={editorImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      void onInlineImageSelected(event);
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <p>
                    {editorMode === 'wysiwyg'
                      ? 'WYSIWYG mode. Type / to open slash commands.'
                      : 'Source mode with editable Markdown, line numbers, and find/replace.'}
                  </p>
                  <p>
                    Paste:{' '}
                    {pasteMode === 'keep' ? 'Keep formatting' : 'Plain text'}
                  </p>
                  <p>Cmd/Ctrl+K: command palette</p>
                  <p>
                    {contentWords} words · {contentCharacters} characters
                  </p>
                  {lastAutosaveAt && (
                    <p>Autosaved {format(new Date(lastAutosaveAt), 'p')}</p>
                  )}
                  {isDirty && <p className="text-amber-500">Unsaved changes</p>}
                </div>
                {errors.content && (
                  <p className="text-sm text-destructive">{errors.content}</p>
                )}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Publish Settings */}
              <Card className="p-6">
                <h3 className="mb-4 font-semibold">Publish Settings</h3>
                <div className="space-y-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          type="button"
                          variant={status === opt.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatus(opt.value)}
                          className="flex-1"
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Featured */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="featured">Featured Post</Label>
                    <Switch
                      id="featured"
                      checked={featured}
                      onCheckedChange={setFeatured}
                    />
                  </div>

                  {/* Read Time */}
                  <div className="space-y-2">
                    <Label htmlFor="readTime">Read Time</Label>
                    <Input
                      id="readTime"
                      value={readTime}
                      onChange={(e) => setReadTime(e.target.value)}
                      placeholder="5 min read"
                    />
                  </div>
                </div>
              </Card>

              {/* Category */}
              <Card className="p-6">
                <h3 className="mb-4 font-semibold">Category</h3>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Loading categories...
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <Button
                          key={cat.id}
                          type="button"
                          variant={
                            categoryId === cat.id ? 'default' : 'outline'
                          }
                          size="sm"
                          onClick={() => setCategoryId(cat.id)}
                          className="justify-start"
                        >
                          {cat.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  {errors.categoryId && (
                    <p className="text-sm text-destructive">
                      {errors.categoryId}
                    </p>
                  )}
                </div>
              </Card>

              {/* Cover Image */}
              <Card className="p-6">
                <h3 className="mb-4 font-semibold">Cover Image</h3>
                <div className="space-y-4">
                  <div
                    ref={coverDropzoneRef}
                    tabIndex={0}
                    className={cn(
                      'rounded-lg border border-dashed p-4 transition-colors',
                      isDragOverCoverImage && 'border-primary bg-primary/5',
                      errors.coverImage && 'border-destructive',
                    )}
                    onPaste={handlePasteCoverImage}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragOverCoverImage(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverCoverImage(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOverCoverImage(false);
                    }}
                    onDrop={(e) => {
                      void handleDropCoverImage(e);
                    }}
                  >
                    <p className="text-sm text-muted-foreground mb-3">
                      Drag & drop an image here, choose a file, or paste one.
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Supported: JPEG, PNG, WebP up to 10MB.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingCoverImage}
                        onClick={() =>
                          document
                            .getElementById('blog-cover-image-input')
                            ?.click()
                        }
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Select Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingCoverImage}
                        onClick={() => coverDropzoneRef.current?.focus()}
                      >
                        <ClipboardPaste className="mr-2 h-4 w-4" />
                        Paste (Cmd/Ctrl + V)
                      </Button>
                      {coverImage && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUploadingCoverImage}
                          onClick={() => {
                            setCoverImage('');
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.coverImage;
                              return next;
                            });
                          }}
                        >
                          Remove Image
                        </Button>
                      )}
                    </div>
                    <input
                      id="blog-cover-image-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void uploadCoverImage(file);
                        }
                        e.currentTarget.value = '';
                      }}
                    />
                    {isUploadingCoverImage && (
                      <p className="mt-3 inline-flex items-center text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Uploading image...
                      </p>
                    )}
                  </div>
                  {errors.coverImage && (
                    <p className="text-sm text-destructive">
                      {errors.coverImage}
                    </p>
                  )}
                  {/* Direct URL input */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Or enter an image URL
                    </Label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={coverImage}
                      onChange={(e) => {
                        setCoverImage(e.target.value);
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.coverImage;
                          return next;
                        });
                      }}
                    />
                  </div>
                  {coverImage && !errors.coverImage && (
                    <div className="aspect-video overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                      <img
                        src={coverImage}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.removeAttribute(
                            'hidden',
                          );
                        }}
                      />
                      <p
                        hidden
                        className="text-xs text-muted-foreground px-4 text-center"
                      >
                        Preview unavailable for this URL — image is saved and
                        will display on the site.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Tags */}
              <Card className="p-6">
                <h3 className="mb-4 font-semibold">Tags</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add a tag..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {tags.length}/10 tags
                  </p>
                </div>
              </Card>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

// ==================== Main Export with Route-based View ====================
export default function AdminBlogsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const location = useLocation();

  // /admin/blogs -> list
  // /admin/blogs/new -> create
  // /admin/blogs/:slug/edit -> edit
  if (location.pathname === '/admin/blogs/new') {
    return <BlogEditor />;
  }

  if (slug && location.pathname.endsWith('/edit')) {
    return <BlogEditor editSlug={slug} />;
  }

  return <BlogList />;
}

// Named exports for direct route usage
export { BlogList, BlogEditor };
