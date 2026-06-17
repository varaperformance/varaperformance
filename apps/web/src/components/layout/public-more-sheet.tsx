import { Link, NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { hapticsLight } from '@/lib/haptics';
import { Button } from '@/components/ui/button';
import { LogIn, Rocket } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Info,
  Rss,
  Users,
  Star,
  Calculator,
  Briefcase,
  Megaphone,
  Newspaper,
  FileText,
  HelpCircle,
  Mail,
} from 'lucide-react';

interface PublicMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections = [
  {
    title: 'Explore',
    items: [
      { title: 'About', icon: Info, href: '/about' },
      { title: 'Blog', icon: Rss, href: '/blog' },
      { title: 'Coaches', icon: Users, href: '/coaches' },
      { title: 'Spotlight', icon: Star, href: '/spotlight' },
      { title: 'Calculators', icon: Calculator, href: '/calculators' },
    ],
  },
  {
    title: 'Company',
    items: [
      { title: 'Careers', icon: Briefcase, href: '/careers' },
      { title: 'Ambassadors', icon: Megaphone, href: '/ambassadors' },
      { title: 'Press', icon: Newspaper, href: '/press' },
      { title: 'Release Notes', icon: FileText, href: '/release-notes' },
    ],
  },
  {
    title: 'Support',
    items: [
      { title: 'FAQ', icon: HelpCircle, href: '/faq' },
      { title: 'Contact', icon: Mail, href: '/contact' },
    ],
  },
];

export default function PublicMoreSheet({
  open,
  onOpenChange,
}: PublicMoreSheetProps) {
  const location = useLocation();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const handleNav = () => {
    void hapticsLight();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>More</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={handleNav}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-colors active:bg-accent',
                        active && 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="line-clamp-1 text-[10px] font-medium leading-tight">
                        {item.title}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Auth CTA */}
          <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-4">
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link to="/login" onClick={handleNav}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </Button>
            <Button
              className="w-full gap-2 shadow-md shadow-primary/25"
              asChild
            >
              <Link to="/register" onClick={handleNav}>
                <Rocket className="h-4 w-4" />
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
