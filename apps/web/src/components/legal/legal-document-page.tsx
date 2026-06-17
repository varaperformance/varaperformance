import {
  useLegalDocument,
  useLegalDocumentByVersion,
  useLegalDocumentVersions,
  type ConsentType,
} from '@/features/auth';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Shield,
  Lock,
  Accessibility,
  ChevronUp,
  Printer,
  Mail,
  Clock,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Info,
  History,
  Hash,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LegalDocumentPageProps {
  type: ConsentType;
  icon?: 'file' | 'shield' | 'lock' | 'accessibility';
  accentColor?: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const iconMap = {
  file: FileText,
  shield: Shield,
  lock: Lock,
  accessibility: Accessibility,
};

const accentColorMap: Record<
  string,
  { bg: string; text: string; border: string; gradient: string }
> = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
    gradient: 'from-primary/5',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
    gradient: 'from-green-500/5',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    gradient: 'from-blue-500/5',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    gradient: 'from-purple-500/5',
  },
};

// Related legal documents for cross-linking
const relatedDocuments: Record<
  string,
  Array<{
    type: string;
    title: string;
    path: string;
    icon: keyof typeof iconMap;
  }>
> = {
  TERMS_OF_SERVICE: [
    {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      path: '/privacy',
      icon: 'shield',
    },
    {
      type: 'SECURITY_POLICY',
      title: 'Security Policy',
      path: '/security',
      icon: 'lock',
    },
  ],
  PRIVACY_POLICY: [
    {
      type: 'TERMS_OF_SERVICE',
      title: 'Terms of Service',
      path: '/terms',
      icon: 'file',
    },
    {
      type: 'SECURITY_POLICY',
      title: 'Security Policy',
      path: '/security',
      icon: 'lock',
    },
  ],
  SECURITY_POLICY: [
    {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      path: '/privacy',
      icon: 'shield',
    },
    {
      type: 'AI_FEATURES_CONSENT',
      title: 'AI Legal',
      path: '/ai-legal',
      icon: 'file',
    },
    {
      type: 'ACCESSIBILITY_STATEMENT',
      title: 'Accessibility',
      path: '/accessibility',
      icon: 'accessibility',
    },
  ],
  HIPAA_AUTHORIZATION: [
    {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      path: '/privacy',
      icon: 'shield',
    },
    {
      type: 'AI_FEATURES_CONSENT',
      title: 'AI Legal',
      path: '/ai-legal',
      icon: 'file',
    },
  ],
  AI_FEATURES_CONSENT: [
    {
      type: 'HIPAA_AUTHORIZATION',
      title: 'HIPAA Authorization',
      path: '/hipaa',
      icon: 'shield',
    },
    {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      path: '/privacy',
      icon: 'shield',
    },
  ],
  ACCESSIBILITY_STATEMENT: [
    {
      type: 'TERMS_OF_SERVICE',
      title: 'Terms of Service',
      path: '/terms',
      icon: 'file',
    },
    {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      path: '/privacy',
      icon: 'shield',
    },
  ],
};

/**
 * Reusable legal document page component
 * Fetches document from backend and renders markdown content
 * Features: Table of contents, reading progress, print support, related documents, version history
 */
export default function LegalDocumentPage({
  type,
  icon = 'file',
  accentColor = 'primary',
}: LegalDocumentPageProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // Fetch current document and available versions
  const {
    data: currentData,
    isLoading: isLoadingCurrent,
    error: currentError,
  } = useLegalDocument(type);
  const { data: versionsData } = useLegalDocumentVersions(type);
  const { data: historicalData, isLoading: isLoadingHistorical } =
    useLegalDocumentByVersion(type, selectedVersion);

  // Use historical document if a specific version is selected, otherwise use current
  const isLoading = selectedVersion ? isLoadingHistorical : isLoadingCurrent;
  const error = selectedVersion ? null : currentError;
  const document = selectedVersion ? historicalData?.data : currentData?.data;
  const versions = versionsData?.data ?? [];

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');

  const Icon = iconMap[icon];
  const colors = accentColorMap[accentColor] || accentColorMap.primary;
  const related = relatedDocuments[type] || [];

  // Memoize document content for dependent calculations
  const documentContent = document?.content ?? '';

  // Extract table of contents from markdown
  const tableOfContents = useMemo<TocItem[]>(() => {
    if (!documentContent) return [];
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const toc: TocItem[] = [];
    let match;
    while ((match = headingRegex.exec(documentContent)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, ''); // Strip markdown formatting
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (level <= 3) {
        toc.push({ id, text, level });
      }
    }
    return toc;
  }, [documentContent]);

  // Calculate reading time
  const readingTime = useMemo(() => {
    if (!documentContent) return 0;
    const words = documentContent.split(/\s+/).length;
    return Math.ceil(words / 200); // 200 words per minute
  }, [documentContent]);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        window.document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setShowBackToTop(scrollTop > 400);

      // Update active section based on scroll position
      const headings = window.document.querySelectorAll(
        'article h1, article h2, article h3',
      );
      let currentSection = '';
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 120) {
          currentSection = heading.id;
        }
      });
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    const element = window.document.getElementById(id);
    if (element) {
      const offset = 100;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <FileText className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Document Not Found</h2>
          <p className="text-muted-foreground">
            Unable to load the requested document. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const lastUpdated = new Date(document.effectiveAt).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );

  // Custom components for markdown rendering with enhanced styling
  const markdownComponents: Components = {
    // Headings with IDs for anchor links
    h1: ({ children }) => {
      const text = String(children);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return (
        <h1
          id={id}
          className="text-3xl font-bold tracking-tight mt-0 mb-6 scroll-mt-24"
        >
          {children}
        </h1>
      );
    },
    h2: ({ children }) => {
      const text = String(children);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return (
        <h2
          id={id}
          className="text-2xl font-bold tracking-tight mt-12 mb-6 pb-3 border-b border-border/50 scroll-mt-24"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children }) => {
      const text = String(children);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return (
        <h3 id={id} className="text-xl font-semibold mt-8 mb-4 scroll-mt-24">
          {children}
        </h3>
      );
    },
    // Paragraphs
    p: ({ children }) => {
      // Check if this is a callout paragraph (starts with bold text like "We never sell your data")
      const childArray = Array.isArray(children) ? children : [children];
      const firstChild = childArray[0];

      // If first element is a strong tag followed by em dash, render as feature card
      if (
        typeof firstChild === 'object' &&
        firstChild !== null &&
        'type' in firstChild &&
        firstChild.type === 'strong'
      ) {
        const restOfContent = childArray.slice(1);
        const hasEmDash = restOfContent.some(
          (c) => typeof c === 'string' && c.includes('—'),
        );

        if (hasEmDash) {
          return (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50 my-3">
              <CheckCircle2
                className={`h-5 w-5 ${colors.text} mt-0.5 shrink-0`}
              />
              <p className="text-muted-foreground m-0 leading-relaxed">
                {children}
              </p>
            </div>
          );
        }
      }

      return (
        <p className="text-muted-foreground leading-relaxed my-4">{children}</p>
      );
    },
    // Lists with nice styling
    ul: ({ children }) => <ul className="my-6 space-y-2">{children}</ul>,
    ol: ({ children }) => (
      <ol className="my-6 space-y-2 list-decimal list-inside">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="flex items-start gap-3 text-muted-foreground">
        <CheckCircle2 className={`h-4 w-4 ${colors.text} mt-1 shrink-0`} />
        <span className="leading-relaxed">{children}</span>
      </li>
    ),
    // Tables with better styling
    table: ({ children }) => (
      <div className="my-8 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50 border-b border-border/50">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-3 text-left font-semibold text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 border-t border-border/30 text-muted-foreground">
        {children}
      </td>
    ),
    // Blockquotes as callout cards
    blockquote: ({ children }) => (
      <div className="my-6 flex gap-4 rounded-lg border-l-4 border-primary bg-primary/5 p-4">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-muted-foreground [&>p]:m-0">{children}</div>
      </div>
    ),
    // Strong text
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        className={`${colors.text} underline underline-offset-4 hover:opacity-80`}
      >
        {children}
      </a>
    ),
    // Code blocks
    code: ({ className, children }) => {
      const isBlock = className?.includes('language-');
      if (isBlock) {
        return (
          <code className="block bg-muted/70 rounded-lg p-4 text-sm overflow-x-auto my-6 border border-border/50">
            {children}
          </code>
        );
      }
      return (
        <code className="bg-muted/70 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    // Pre for code blocks
    pre: ({ children }) => (
      <pre className="bg-muted/70 rounded-lg p-4 overflow-x-auto my-6 border border-border/50 text-sm">
        {children}
      </pre>
    ),
    // Horizontal rule
    hr: () => <hr className="my-8 border-border/50" />,
  };

  return (
    <div className="flex flex-col">
      {/* Reading Progress Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 h-1 bg-muted print:hidden">
        <div
          className={`h-full ${colors.bg.replace('/10', '')} transition-all duration-150`}
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Hero Header */}
      <section
        className={`relative overflow-hidden border-b border-border/40 py-16 md:py-20 bg-linear-to-br ${colors.gradient} via-transparent to-transparent`}
      >
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div
              className={`mb-6 inline-flex items-center gap-2 rounded-full border ${colors.border} ${colors.bg} px-4 py-1.5 text-sm font-medium ${colors.text}`}
            >
              <Icon className="h-4 w-4" />
              Legal Document
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              {document.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {readingTime} min read
              </span>
              <span>•</span>
              {/* Version Selector Dropdown */}
              {versions.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <History className="h-4 w-4" />
                      Version {document.version}
                      {selectedVersion &&
                        !versions.find((v) => v.version === selectedVersion)
                          ?.isActive && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            (archived)
                          </span>
                        )}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    {versions.map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        onClick={() =>
                          setSelectedVersion(v.isActive ? null : v.version)
                        }
                        className={
                          document.version === v.version ? 'bg-muted' : ''
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span>{v.version}</span>
                          {v.isActive && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              (current)
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.effectiveAt).toLocaleDateString()}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span>Version {document.version}</span>
              )}
              <span>•</span>
              <span>Updated {lastUpdated}</span>
            </div>
            {/* Document Hash for Integrity Verification */}
            {document.hashValue && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
                <Hash className="h-3 w-3" />
                <span
                  className="select-all"
                  title="SHA-256 document hash for integrity verification"
                >
                  SHA-256: {document.hashValue}
                </span>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/contact">
                  <Mail className="mr-2 h-4 w-4" />
                  Questions?
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className="flex gap-12">
              {/* Table of Contents - Sticky Sidebar */}
              {tableOfContents.length > 0 && (
                <aside className="hidden w-64 shrink-0 lg:block print:hidden">
                  <div className="sticky top-24">
                    <div className="rounded-xl border border-border/50 bg-card/50 p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                        <BookOpen className="h-4 w-4" />
                        On This Page
                      </div>
                      <nav className="space-y-1">
                        {tableOfContents.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`block w-full text-left text-sm transition-colors hover:text-foreground ${
                              item.level === 1
                                ? 'font-medium'
                                : item.level === 2
                                  ? 'pl-3'
                                  : 'pl-6 text-xs'
                            } ${
                              activeSection === item.id
                                ? `${colors.text} font-medium`
                                : 'text-muted-foreground'
                            }`}
                          >
                            {item.text}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Related Documents */}
                    {related.length > 0 && (
                      <div className="mt-6 rounded-xl border border-border/50 bg-card/50 p-5">
                        <div className="mb-4 text-sm font-semibold">
                          Related Documents
                        </div>
                        <div className="space-y-2">
                          {related.map((doc) => {
                            const RelatedIcon = iconMap[doc.icon];
                            return (
                              <Link
                                key={doc.type}
                                to={doc.path}
                                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <RelatedIcon className="h-4 w-4" />
                                {doc.title}
                                <ChevronRight className="ml-auto h-4 w-4" />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </aside>
              )}

              {/* Document Content */}
              <div className="min-w-0 flex-1">
                <article className="max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {document.content}
                  </ReactMarkdown>
                </article>

                {/* Mobile Related Documents */}
                {related.length > 0 && (
                  <div className="mt-12 rounded-xl border border-border/50 bg-card/50 p-6 lg:hidden print:hidden">
                    <div className="mb-4 font-semibold">Related Documents</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {related.map((doc) => {
                        const RelatedIcon = iconMap[doc.icon];
                        return (
                          <Link
                            key={doc.type}
                            to={doc.path}
                            className="flex items-center gap-3 rounded-lg border border-border/50 bg-background p-4 transition-colors hover:border-primary/30"
                          >
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}
                            >
                              <RelatedIcon
                                className={`h-5 w-5 ${colors.text}`}
                              />
                            </div>
                            <span className="font-medium">{doc.title}</span>
                            <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="border-t border-border/40 bg-muted/30 py-12 print:hidden">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Mail className={`mx-auto mb-4 h-10 w-10 ${colors.text}`} />
            <h2 className="mb-3 text-xl font-semibold">Have Questions?</h2>
            <p className="mb-6 text-muted-foreground">
              If you have any questions about this{' '}
              {document.title.toLowerCase()}, please don't hesitate to contact
              us.
            </p>
            <Button asChild>
              <Link to="/contact">Contact Our Team</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full ${colors.bg} ${colors.text} shadow-lg transition-all hover:scale-110 print:hidden`}
          aria-label="Back to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
