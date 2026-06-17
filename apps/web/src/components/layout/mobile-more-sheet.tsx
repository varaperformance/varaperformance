import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { hapticsLight } from '@/lib/haptics';
import { useRequirePermission } from '@/features/auth';
import {
  healthNavGroups,
  socialNavItems,
  coachNavItems,
  calendarNavItem,
  shopOrdersNavItem,
  mainNavItems,
  SidebarCategoryLabel,
  sidebarSubgroupTriggerClass,
} from '@/components/layout/app-sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useHealthNavGroupOpen } from '@/hooks/use-health-nav-group-open';

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileMoreSheet({
  open,
  onOpenChange,
}: MobileMoreSheetProps) {
  const location = useLocation();
  const canCoach = useRequirePermission('coaching:read');
  const canCalendar = useRequirePermission('calendar:read');
  const { openById, setGroupOpen } = useHealthNavGroupOpen();

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
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>More</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-4">
          {/* Main */}
          <div>
            <SidebarCategoryLabel>Main</SidebarCategoryLabel>
            <div className="grid grid-cols-4 gap-2">
              {[...mainNavItems, shopOrdersNavItem].map((item) => {
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
                    <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                      {item.title}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {canCalendar && (
            <div>
              <SidebarCategoryLabel>Calendar</SidebarCategoryLabel>
              <div className="grid grid-cols-4 gap-2">
                {(() => {
                  const item = calendarNavItem;
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
                      <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                        {item.title}
                      </span>
                    </NavLink>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Health — same groups + styling as desktop sidebar */}
          <div>
            <SidebarCategoryLabel>Health</SidebarCategoryLabel>
            <div className="space-y-1">
              {healthNavGroups.map((group) => (
                <Collapsible
                  key={group.id}
                  open={openById[group.id] ?? true}
                  onOpenChange={(next) => setGroupOpen(group.id, next)}
                >
                  <CollapsibleTrigger
                    type="button"
                    className={cn(
                      sidebarSubgroupTriggerClass,
                      'rounded-lg py-2',
                    )}
                  >
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-45 transition-transform duration-200" />
                    <span className="min-w-0 flex-1 truncate">
                      {group.label}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-4 gap-2 pb-2 pt-1">
                      {group.items.map((item) => {
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
                            <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                              {item.title}
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Social */}
          <div>
            <SidebarCategoryLabel>Social</SidebarCategoryLabel>
            <div className="grid grid-cols-4 gap-2">
              {socialNavItems.map((item) => {
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
                    <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                      {item.title}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {canCoach && (
            <div>
              <SidebarCategoryLabel>Coaching</SidebarCategoryLabel>
              <div className="grid grid-cols-4 gap-2">
                {coachNavItems.map((item) => {
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
                      <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                        {item.title}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
