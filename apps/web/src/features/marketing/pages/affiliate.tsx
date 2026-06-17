import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Users,
  TrendingUp,
  Gift,
  CheckCircle,
  Percent,
  Clock,
  Zap,
} from 'lucide-react';

const benefits = [
  {
    icon: <Percent className="h-6 w-6" />,
    title: '30% Commission',
    description:
      "Earn 30% recurring commission on every paid subscription you refer. That's up to $15 per coach, every month.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: '90-Day Cookie',
    description:
      'Our generous 90-day cookie window means you get credit even if users sign up months after clicking your link.',
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: 'Real-Time Dashboard',
    description:
      'Track clicks, signups, and earnings in real-time with our comprehensive affiliate dashboard.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Fast Payouts',
    description:
      'Get paid monthly via PayPal or direct deposit. No minimum threshold—earn $1, get $1.',
  },
  {
    icon: <Gift className="h-6 w-6" />,
    title: 'Exclusive Resources',
    description:
      'Access banners, graphics, email templates, and promo codes to help you convert more referrals.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Dedicated Support',
    description:
      'Our affiliate team is here to help you succeed with personalized tips and strategies.',
  },
];

const idealPartners = [
  {
    title: 'Personal Trainers',
    description:
      'Recommend Vara Performance to your clients and earn passive income alongside your coaching business.',
  },
  {
    title: 'Gym Owners',
    description:
      'Refer your members to our platform and earn commissions while providing them extra value.',
  },
  {
    title: 'Everyday Movers',
    description:
      'Training partners always ask what you use. Get rewarded when they sign up.',
  },
  {
    title: 'Strength Coaches',
    description:
      'Help your members track their training and earn when teams or individuals subscribe.',
  },
  {
    title: 'Fitness Writers',
    description:
      'Write honest reviews or tutorials and earn from readers who find value in your recommendations.',
  },
  {
    title: 'Community Leaders',
    description:
      'Run a lifting club, CrossFit box, or running group? Share tools that actually help.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Apply',
    description:
      'Fill out our quick application form. We review applications within 48 hours.',
  },
  {
    step: '02',
    title: 'Get Approved',
    description:
      "Once approved, you'll get your unique affiliate link and access to our partner dashboard.",
  },
  {
    step: '03',
    title: 'Share',
    description:
      'Promote Vara Performance through your content, social media, or website.',
  },
  {
    step: '04',
    title: 'Earn',
    description:
      'Get 30% recurring commission on every paid subscription from your referrals.',
  },
];

const faqs = [
  {
    question: 'Who can become an affiliate?',
    answer:
      'Coaches, trainers, gym owners, members, and anyone genuinely passionate about helping others achieve their fitness goals. We prioritize partners who use and believe in the product.',
  },
  {
    question: 'How much can I earn?',
    answer:
      'You earn 30% recurring commission on all paid subscriptions. With our Coach plan at $19.99/month and Gym plan at $49.99/month, your earnings can add up quickly. Top affiliates earn $2,000+ per month.',
  },
  {
    question: 'When do I get paid?',
    answer:
      "Payouts are processed on the 1st of each month for the previous month's earnings. There's no minimum threshold—if you earned it, you get it.",
  },
  {
    question: 'How long does the cookie last?',
    answer:
      'Our cookies last 90 days. If someone clicks your link and signs up for a paid plan within 90 days, you get the commission.',
  },
  {
    question: 'Do I need to be a Vara Performance user?',
    answer:
      'While not required, we encourage affiliates to use the platform so they can speak authentically about its benefits. Your genuine experience resonates with your audience.',
  },
  {
    question: 'Can I use paid advertising?',
    answer:
      'Yes, with some restrictions. You cannot bid on branded terms (Vara, Vara Performance) or use misleading ads. Full guidelines are in our affiliate agreement.',
  },
];

const AffiliatePage = () => {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-linear-to-b from-muted/50 to-background py-20 md:py-28">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              Earn with Vara Performance
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Get Rewarded for{' '}
              <span className="text-primary">Genuine Recommendations</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Already using Vara Performance? Earn 30% recurring commission when
              you share it with training partners, clients, or your community.
              No hype required—just honest recommendations.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/contact">
                  Apply Now
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/pricing">View Our Plans</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Why Partner With Us
            </h2>
            <p className="text-lg text-muted-foreground">
              We offer one of the most supportive affiliate programs in the
              fitness industry.
            </p>
          </div>
          <div
            className={cn(
              'grid gap-6',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {benefit.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-y border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Getting started is simple. Be up and running in minutes.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            {/* Connector line */}
            <div className="relative hidden lg:block">
              <div className="absolute left-[12.5%] right-[12.5%] top-7 h-0.5 bg-border" />
            </div>
            <div
              className={cn(
                'grid gap-8',
                isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4',
              )}
            >
              {howItWorks.map((item, index) => (
                <div key={index} className="relative text-center">
                  <div className="relative z-10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ideal Partners Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Who This Is For
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for people who actually train—not just talk about it.
            </p>
          </div>
          <div
            className={cn(
              'grid gap-6',
              isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3',
            )}
          >
            {idealPartners.map((partner, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{partner.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {partner.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/40 bg-primary py-16 text-primary-foreground">
        <div className="container">
          <div
            className={cn(
              'grid gap-8 text-center',
              isMobile ? 'grid-cols-2' : 'md:grid-cols-4',
            )}
          >
            <div>
              <div className="mb-2 text-4xl font-bold">30%</div>
              <div className="text-primary-foreground/80">
                Recurring Commission
              </div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold">90</div>
              <div className="text-primary-foreground/80">
                Day Cookie Window
              </div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold">$0</div>
              <div className="text-primary-foreground/80">Minimum Payout</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold">48hr</div>
              <div className="text-primary-foreground/80">
                Application Review
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our affiliate program.
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border/60 bg-card p-6"
                >
                  <h3 className="mb-2 font-semibold">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Start Earning?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join coaches and members already earning with Vara Performance.
              Application takes less than 5 minutes.
            </p>
            <Button size="lg" asChild>
              <Link to="/contact">
                Apply to Affiliate Program
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AffiliatePage;
