import { Link } from 'react-router';
import {
  HelpCircle,
  Search,
  MessageCircle,
  Mail,
  Book,
  Loader2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useState, useMemo } from 'react';
import { usePublicFaqs } from '@/features/faq';

const FAQPage = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: faqsResponse, isLoading, error } = usePublicFaqs();
  const faqCategories = useMemo(() => faqsResponse?.data ?? [], [faqsResponse]);

  // Flatten FAQs with category info for filtering
  const allFaqs = useMemo(() => {
    return faqCategories.flatMap((category) =>
      category.faqs.map((faq) => ({
        ...faq,
        category: category.name,
        categorySlug: category.slug,
      })),
    );
  }, [faqCategories]);

  const categories = useMemo(() => {
    return ['all', ...faqCategories.map((cat) => cat.name)];
  }, [faqCategories]);

  const filteredFaqs = useMemo(() => {
    return allFaqs.filter((faq) => {
      const matchesSearch =
        searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === 'all' || faq.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allFaqs, searchQuery, activeCategory]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
              Frequently Asked
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}
                Questions
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Find answers to common questions about Vara Performance. Can't
              find what you're looking for? Contact our support team.
            </p>

            {/* Search */}
            <div className="mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-border/50 bg-background py-3 pl-12 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-16 z-40 border-b border-border/40 bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {category === 'all' ? 'All Questions' : category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
                <HelpCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Failed to load FAQs. Please try again later.
                </p>
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
                <HelpCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No questions found matching your search.
                </p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={`item-${faq.id}`}
                    className={`rounded-xl border border-border/50 px-6 ${
                      faq.isFeatured ? 'bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <AccordionTrigger className="hover:no-underline py-6">
                      <div className="flex items-start gap-3 text-left">
                        {faq.isFeatured && (
                          <Star className="mt-0.5 h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs font-medium text-primary">
                              {faq.category}
                            </span>
                            {faq.isFeatured && (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                                Popular
                              </span>
                            )}
                          </div>
                          <span className="font-semibold">{faq.question}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-border/50 bg-muted/30 -mx-6 px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {faq.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Still Need Help?</h2>
              <p className="text-muted-foreground">
                Our support team is here to assist you
              </p>
            </div>
            <div className={cn('grid gap-6', !isMobile && 'md:grid-cols-3')}>
              <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
                <MessageCircle className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">Live Chat</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Chat with our team in real-time
                </p>
                <Button variant="outline" size="sm">
                  Start Chat
                </Button>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
                <Mail className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">Email Support</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Get help via email
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
                <Book className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 font-semibold">Documentation</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Browse guides and tutorials
                </p>
                <Button variant="outline" size="sm">
                  View Docs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;
