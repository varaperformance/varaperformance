import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import logo from '@/assets/images/logo.png';

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FooterSection({ title, children }: FooterSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Desktop: always-visible heading */}
      <h4 className="hidden text-sm font-semibold md:block">{title}</h4>
      {/* Mobile: collapsible accordion */}
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {/* Desktop: always visible. Mobile: collapsed by default */}
      <div className={`${open ? 'block' : 'hidden'} md:block`}>{children}</div>
    </div>
  );
}

const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Main Footer */}
      <div className="container py-8 md:py-12">
        <div className="grid gap-6 md:gap-8 lg:grid-cols-6">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-2">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="Vara Performance"
                className="h-9 w-9 rounded-lg"
              />
              <span className="text-xl font-bold tracking-tight">
                Vara Performance
              </span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Your fitness journey starts here. Track workouts, analyze
              progress, and achieve your goals.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/varaperformance"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Instagram @varaperformance"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/MGrfchn2kh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Join Vara Performance Discord"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.369A19.791 19.791 0 0015.126 3l-.245.498a18.27 18.27 0 013.915 1.204 12.478 12.478 0 00-3.701-1.145 13.154 13.154 0 00-6.19 0A12.455 12.455 0 005.2 4.702a18.19 18.19 0 013.915-1.204L8.87 3a19.736 19.736 0 00-5.19 1.368C1.388 7.74.766 10.977 1.076 14.168a19.9 19.9 0 006.356 3.222l.772-1.269a13.044 13.044 0 01-2.058-.99c.173.128.354.248.54.358a9.45 9.45 0 008.627 0c.187-.11.368-.23.542-.359-.66.397-1.35.73-2.06.99l.772 1.27a19.88 19.88 0 006.358-3.223c.365-3.704-.624-6.91-2.832-9.799zM8.02 12.226c-1.046 0-1.9-.956-1.9-2.133 0-1.177.843-2.133 1.9-2.133 1.058 0 1.91.965 1.9 2.133 0 1.177-.843 2.133-1.9 2.133zm7.96 0c-1.046 0-1.9-.956-1.9-2.133 0-1.177.843-2.133 1.9-2.133 1.057 0 1.91.965 1.9 2.133 0 1.177-.844 2.133-1.9 2.133z" />
                </svg>
              </a>
            </div>
          </div>

          <FooterSection title="Product">
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/features"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to="/roadmap"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Roadmap
                </Link>
              </li>
              <li>
                <Link
                  to="/release-notes"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  What's New
                </Link>
              </li>
            </ul>
          </FooterSection>

          <FooterSection title="Company">
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/team"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Team
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/press"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Press
                </Link>
              </li>
              <li>
                <Link
                  to="/affiliate"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Affiliates
                </Link>
              </li>
              <li>
                <Link
                  to="/ambassadors"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ambassadors
                </Link>
              </li>
            </ul>
          </FooterSection>

          <FooterSection title="Resources">
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/faq"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/status"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Status
                </Link>
              </li>
              <li>
                <Link
                  to="/github-status"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  GitHub Status
                </Link>
              </li>
            </ul>
          </FooterSection>

          <FooterSection title="Legal">
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/privacy"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  to="/security"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  to="/hipaa"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  HIPAA
                </Link>
              </li>
              <li>
                <Link
                  to="/ai-legal"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  AI Legal
                </Link>
              </li>
              <li>
                <Link
                  to="/accessibility"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </FooterSection>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/40">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vara Performance. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Made with 💪 for every member</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
