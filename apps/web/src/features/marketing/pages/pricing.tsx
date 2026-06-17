import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';
import {
  Check,
  Sparkles,
  Users,
  Building2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  icon: React.ReactNode;
  features: string[];
  highlighted?: boolean;
  badgeLabel?: string;
  cta: string;
  ctaLink: string;
}

interface PublicPricingPlan {
  id: string;
  name: string;
  audience: 'FREE' | 'COACH' | 'GYM';
  description: string | null;
  priceInCents: number;
  periodLabel: string | null;
  highlighted: boolean;
  cta: string;
  ctaLink: string;
  features: Array<{ id: string; text: string; sortOrder: number }>;
}

const PricingPage = () => {
  const isMobile = useIsMobile();
  const { data: pricingData } = useQuery({
    queryKey: ['public-pricing-plans'],
    queryFn: async () => {
      const response = await api.get<
        SuccessResponse<{ plans: PublicPricingPlan[] }>
      >('/payments/pricing/plans');
      return response.data;
    },
  });

  const tiers: PricingTier[] = pricingData?.data?.plans?.length
    ? pricingData.data.plans
        .slice()
        .sort((a, b) => {
          const weight = { FREE: 0, COACH: 1, GYM: 2 };
          return weight[a.audience] - weight[b.audience];
        })
        .map((plan) => {
          const icon =
            plan.audience === 'FREE' ? (
              <Sparkles className="h-6 w-6" />
            ) : plan.audience === 'COACH' ? (
              <Users className="h-6 w-6" />
            ) : (
              <Building2 className="h-6 w-6" />
            );

          return {
            name: plan.name,
            description: plan.description || '',
            price:
              plan.priceInCents === 0
                ? '$0'
                : `$${(plan.priceInCents / 100).toFixed(2)}`,
            period: plan.periodLabel || '',
            icon,
            features: plan.features
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((feature) => feature.text),
            highlighted: plan.audience === 'FREE' || plan.highlighted,
            badgeLabel: plan.audience === 'FREE' ? 'Most Popular' : 'Popular',
            cta: plan.cta,
            ctaLink: plan.ctaLink,
          };
        })
    : [];

  const faqs = [
    {
      question: 'Is Vara Performance really free?',
      answer:
        "Yes! All the core features—workout logging, macro tracking, analytics, gym partner matching, and more—are completely free. We believe fitness tracking shouldn't be paywalled.",
    },
    {
      question: 'How do you make money then?',
      answer:
        'Our Coaches and Gyms plans are designed for fitness professionals and facilities who need client management tools. Health tools like workout logging and macro tracking are always ad-free, and we never sell your data.',
    },
    {
      question: 'Will free features ever become paid?',
      answer:
        "No. Features that are free today will stay free forever. We might add premium features in the future, but we won't take away what you already have.",
    },
    {
      question: 'Can I export my data?',
      answer:
        'Absolutely. Your data belongs to you. Export everything anytime in standard formats—no restrictions, no fees.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="vara-marketing-orb-drift-slow absolute -right-24 -top-16 h-80 w-80 rounded-full bg-primary/12 blur-3xl" />
          <div className="vara-marketing-orb-drift-delayed absolute -bottom-10 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 text-sm font-medium text-green-600 delay-75 duration-500 motion-reduce:animate-none dark:text-green-400">
              <Check className="h-4 w-4" />
              Free features that others charge for
            </div>
            <h1 className="mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-5xl font-bold tracking-tight delay-150 duration-700 motion-reduce:animate-none md:text-6xl">
              Fitness tracking
              <span className="vara-marketing-gradient-text bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}
                should be free
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-300 duration-700 motion-reduce:animate-none">
              Unlimited workout logging, macro tracking, analytics, and more—all
              free, forever. No paywalls, ad-free health tools, no selling your
              data.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="container">
          {tiers.length > 0 ? (
            <div
              className={cn(
                'mx-auto grid max-w-6xl gap-8',
                !isMobile && 'md:grid-cols-3',
              )}
            >
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`relative rounded-2xl border p-8 ${
                    tier.highlighted
                      ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                      : 'border-border/50 bg-card'
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                      {tier.badgeLabel || 'Most Popular'}
                    </div>
                  )}

                  <div className="mb-6">
                    <div
                      className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                        tier.highlighted
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {tier.icon}
                    </div>
                    <h3 className="mb-2 text-2xl font-bold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tier.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {tier.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-3 text-sm"
                      >
                        <Check className="h-5 w-5 shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      tier.highlighted ? 'shadow-lg shadow-primary/25' : ''
                    }`}
                    variant={tier.highlighted ? 'default' : 'outline'}
                    size="lg"
                    asChild
                  >
                    <Link to={tier.ctaLink}>
                      {tier.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-md text-center py-12">
              <p className="text-muted-foreground">
                Pricing plans are being updated. Check back soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Compare All Features
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-4 text-left font-semibold">Feature</th>
                    <th className="pb-4 text-center font-semibold">Free</th>
                    <th className="pb-4 text-center font-semibold">Coaches</th>
                    <th className="pb-4 text-center font-semibold">Gyms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ['Unlimited workout logging', true, true, true],
                    ['Barcode food scanning', true, true, true],
                    ['Macro tracking', true, true, true],
                    ['Progress analytics & charts', true, true, true],
                    ['Exercise library with videos', true, true, true],
                    ['Custom program builder', true, true, true],
                    ['Custom profile themes', true, true, true],
                    ['Gym partner matching', true, true, true],
                    ['Data export', true, true, true],
                    ['Ad-free health tools', true, true, true],
                    ['Client profiles', false, 'Up to 25', 'Unlimited'],
                    ['Assign workouts to clients', false, true, true],
                    ['View client logs & metrics', false, true, true],
                    ['Scheduling & check-ins', false, true, true],
                    ['In-app messaging', false, true, true],
                    ['Payments handled by us', false, true, true],
                    ['Multiple coach accounts', false, false, true],
                    ['Class scheduling', false, false, true],
                    ['Facility-wide analytics', false, false, true],
                    ['Custom branding', false, false, true],
                    ['API access', false, false, true],
                    ['Priority support', false, true, 'Dedicated'],
                  ].map(([feature, free, coaches, gyms], index) => (
                    <tr key={index}>
                      <td className="py-4 text-sm">{feature}</td>
                      <td className="py-4 text-center">
                        {typeof free === 'boolean' ? (
                          free ? (
                            <Check className="mx-auto h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-sm">{free}</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        {typeof coaches === 'boolean' ? (
                          coaches ? (
                            <Check className="mx-auto h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-sm">{coaches}</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        {typeof gyms === 'boolean' ? (
                          gyms ? (
                            <Check className="mx-auto h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-sm">{gyms}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h2 className="mb-4 text-3xl font-bold">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border/50 bg-card p-6"
                >
                  <h3 className="mb-2 font-semibold">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Everything you need to track your fitness is free. No credit card
              required, no trial that expires. Just sign up and start training.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="shadow-lg shadow-primary/25" asChild>
                <Link to="/register">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/features">See All Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
