import {
  Newspaper,
  Download,
  Image,
  FileText,
  Mail,
  ExternalLink,
  Calendar,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';

const PressPage = () => {
  const isMobile = useIsMobile();
  const pressReleases = [
    {
      date: 'February 1, 2026',
      title: 'Vara Performance Launches Version 2.0 with AI-Powered Features',
      excerpt:
        'Major update introduces AI workout recommendations, redesigned interface, and expanded device integrations.',
    },
    {
      date: 'December 15, 2025',
      title: 'Vara Performance Surpasses 1 Million Active Users',
      excerpt:
        'Fitness tracking platform celebrates milestone achievement as user base doubles in six months.',
    },
    {
      date: 'October 1, 2025',
      title: 'Vara Performance Raises $15M Series A to Expand Platform',
      excerpt:
        'Funding round led by Fitness Ventures will accelerate product development and international expansion.',
    },
    {
      date: 'July 20, 2025',
      title: 'Introducing Team Plans: Vara Performance for Coaches and Gyms',
      excerpt:
        'New enterprise features enable coaches and fitness businesses to manage multiple individuals.',
    },
  ];

  const mediaAssets = [
    {
      icon: <Image className="h-6 w-6" />,
      title: 'Logo Package',
      description: 'High-resolution logos in various formats (PNG, SVG, EPS)',
      downloadLabel: 'Download Logos',
    },
    {
      icon: <Image className="h-6 w-6" />,
      title: 'Product Screenshots',
      description: 'App screenshots for web, iOS, and Android platforms',
      downloadLabel: 'Download Screenshots',
    },
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'Brand Guidelines',
      description: 'Colors, typography, and usage guidelines',
      downloadLabel: 'Download Guidelines',
    },
    {
      icon: <Image className="h-6 w-6" />,
      title: 'Team Photos',
      description: 'Leadership headshots and team photos',
      downloadLabel: 'Download Photos',
    },
  ];

  const coverageHighlights = [
    {
      outlet: 'TechCrunch',
      quote:
        'Vara Performance is reimagining how members track and improve their fitness journey.',
      date: 'January 2026',
    },
    {
      outlet: 'Wired',
      quote: 'The fitness app that finally gets strength training right.',
      date: 'December 2025',
    },
    {
      outlet: 'Forbes',
      quote: 'One of the most promising fitness startups to watch in 2026.',
      date: 'November 2025',
    },
  ];

  const companyFacts = [
    { label: 'Founded', value: '2024' },
    { label: 'Headquarters', value: 'San Francisco, CA' },
    { label: 'Active Users', value: '1M+' },
    { label: 'Countries', value: '50+' },
    { label: 'Team Size', value: '45+' },
    { label: 'Total Funding', value: '$18M' },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Newspaper className="h-4 w-4" />
              Press & Media
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
              Media
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}
                Resources
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Everything you need to write about Vara Performance. Download
              brand assets, read press releases, and get in touch with our PR
              team.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="shadow-lg shadow-primary/25">
                <Download className="mr-2 h-4 w-4" />
                Download Press Kit
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:press@varaperformance.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact PR Team
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Company Facts */}
      <section className="border-b border-border/40 py-12">
        <div className="container">
          <div
            className={cn(
              'grid grid-cols-1 gap-6',
              isMobile ? '' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
            )}
          >
            {companyFacts.map((fact) => (
              <div key={fact.label} className="text-center">
                <div className="mb-1 text-2xl font-bold text-primary">
                  {fact.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {fact.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-3xl font-bold">About Vara Performance</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Vara Performance is a comprehensive fitness tracking platform
                designed to help individuals of all levels track, analyze, and
                improve their training. Founded in 2024, the company has grown
                to serve over one million active users across 50+ countries.
              </p>
              <p>
                The platform offers workout logging, progress analytics,
                exercise libraries, and integrations with popular fitness
                devices and apps. Vara Performance is available on web, iOS, and
                Android, with data syncing seamlessly across all devices.
              </p>
              <p>
                Headquartered in San Francisco, California, Vara Performance is
                backed by leading investors including Fitness Ventures, Health
                Tech Capital, and prominent angel investors from the fitness and
                technology industries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-3xl font-bold">Press Releases</h2>
            <div className="space-y-6">
              {pressReleases.map((release, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/30"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {release.date}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {release.title}
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {release.excerpt}
                  </p>
                  <Button variant="ghost" size="sm">
                    Read More
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Media Coverage */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-3xl font-bold">In the News</h2>
            <div
              className={cn(
                'grid gap-6',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-3',
              )}
            >
              {coverageHighlights.map((coverage, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border/50 bg-card p-6"
                >
                  <Quote className="mb-4 h-8 w-8 text-primary/40" />
                  <p className="mb-4 text-sm italic text-muted-foreground">
                    "{coverage.quote}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{coverage.outlet}</span>
                    <span className="text-xs text-muted-foreground">
                      {coverage.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Media Assets */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-3xl font-bold">Brand Assets</h2>
            <div
              className={cn(
                'grid gap-6',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-2',
              )}
            >
              {mediaAssets.map((asset) => (
                <div
                  key={asset.title}
                  className="flex items-start gap-4 rounded-xl border border-border/50 bg-card p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {asset.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 font-semibold">{asset.title}</h3>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {asset.description}
                    </p>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      {asset.downloadLabel}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border/50 bg-card p-8 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-4 text-2xl font-bold">Media Inquiries</h2>
            <p className="mb-6 text-muted-foreground">
              For press inquiries, interview requests, or additional
              information, please contact our PR team.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild>
                <a href="mailto:press@varaperformance.com">
                  press@varaperformance.com
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PressPage;
