import { Link } from 'react-router';
import {
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  HelpCircle,
  Bug,
  Briefcase,
  Users,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useState } from 'react';
import api from '@/lib/api';

const ContactPage = () => {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await api.post('/contact', formData);
      setStatus('sent');
      setFormData({ name: '', email: '', subject: 'general', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const contactReasons = [
    {
      icon: <HelpCircle className="h-6 w-6" />,
      title: 'General Support',
      description: 'Questions about using Vara Performance',
      email: 'support@varaperformance.com',
    },
    {
      icon: <Bug className="h-6 w-6" />,
      title: 'Report a Bug',
      description: 'Help us improve by reporting issues',
      email: 'bugs@varaperformance.com',
    },
    {
      icon: <Briefcase className="h-6 w-6" />,
      title: 'Business Inquiries',
      description: 'Partnerships and enterprise solutions',
      email: 'business@varaperformance.com',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Press & Media',
      description: 'Media inquiries and press resources',
      email: 'press@varaperformance.com',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-24">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <MessageCircle className="h-4 w-4" />
              Get in Touch
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
              Contact
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {' '}
                Our Team
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Have a question, feedback, or just want to say hello? We'd love to
              hear from you. Our team typically responds within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div
              className={cn(
                'grid gap-6',
                !isMobile && 'md:grid-cols-2 lg:grid-cols-4',
              )}
            >
              {contactReasons.map((reason) => (
                <div
                  key={reason.title}
                  className="rounded-xl border border-border/50 bg-card p-6 transition-colors hover:border-primary/30"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {reason.icon}
                  </div>
                  <h3 className="mb-2 font-semibold">{reason.title}</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {reason.description}
                  </p>
                  <a
                    href={`mailto:${reason.email}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {reason.email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="border-t border-border/40 bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <div className={cn('grid gap-12', !isMobile && 'lg:grid-cols-2')}>
              {/* Form */}
              <div className="rounded-2xl border border-border/50 bg-card p-8">
                <h2 className="mb-6 text-2xl font-bold">Send Us a Message</h2>

                {status === 'sent' ? (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <h3 className="text-xl font-semibold">Message sent!</h3>
                    <p className="text-muted-foreground">
                      We'll get back to you within 24 hours.
                    </p>
                    <Button variant="outline" onClick={() => setStatus('idle')}>
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div
                      className={cn(
                        'grid gap-6',
                        !isMobile && 'sm:grid-cols-2',
                      )}
                    >
                      <div>
                        <label
                          htmlFor="name"
                          className="mb-2 block text-sm font-medium"
                        >
                          Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-2 block text-sm font-medium"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="mb-2 block text-sm font-medium"
                      >
                        Subject
                      </label>
                      <select
                        id="subject"
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="general">General Question</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing Issue</option>
                        <option value="feedback">Feedback</option>
                        <option value="partnership">Partnership Inquiry</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="mb-2 block text-sm font-medium"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="How can we help?"
                        required
                      />
                    </div>

                    {status === 'error' && (
                      <p className="text-sm text-red-500">
                        Something went wrong. Please try again or email us
                        directly.
                      </p>
                    )}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={status === 'sending'}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {status === 'sending' ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                )}
              </div>

              {/* Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="mb-6 text-2xl font-bold">
                    Other Ways to Reach Us
                  </h2>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Mail className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Email</h3>
                        <p className="text-sm text-muted-foreground">
                          For general inquiries
                        </p>
                        <a
                          href="mailto:hello@varaperformance.com"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          hello@varaperformance.com
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Location</h3>
                        <p className="text-sm text-muted-foreground">
                          Remote
                          <br />
                          Clarksville, Tennessee 37043
                          <br />
                          United States
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Response Time</h3>
                        <p className="text-sm text-muted-foreground">
                          We typically respond within 24 hours during business
                          days.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <h3 className="mb-4 font-semibold">Quick Links</h3>
                  <div className="space-y-3">
                    <Link
                      to="/faq"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Check our FAQ
                    </Link>
                    <Link
                      to="/status"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Clock className="h-4 w-4" />
                      System Status
                    </Link>
                    <Link
                      to="/careers"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Briefcase className="h-4 w-4" />
                      Join Our Team
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
