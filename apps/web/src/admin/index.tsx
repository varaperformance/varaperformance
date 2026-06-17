import { Link } from 'react-router';
import {
  useAdminStats,
  useQueueHealth,
  useAdminDAU,
  useAdminDAUToday,
} from '@/hooks/use-admin';
import type { RecentActivityItem } from '@/hooks/use-admin';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from '@/components/ui/chart';
import {
  Users,
  Shield,
  FileText,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Lock,
  Database,
  Download,
  ScrollText,
  Trash2,
  TrendingUp,
  ArrowRight,
  Activity,
  DollarSign,
  Flag,
  CalendarCheck,
  UtensilsCrossed,
  Server,
  AlertCircle,
  Dumbbell,
  CreditCard,
  ScrollText as ReleaseIcon,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '@/components/theme-context';

// Quick action cards data
const quickActions = [
  {
    title: 'Manage Users',
    description: 'View and manage user accounts',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'New Blog Post',
    description: 'Write and publish content',
    href: '/admin/blogs',
    icon: FileText,
  },
  {
    title: 'Review Coaches',
    description: 'Approve pending applications',
    href: '/admin/coaches',
    icon: UserCheck,
  },
  {
    title: 'Check Incidents',
    description: 'View system status',
    href: '/admin/status',
    icon: AlertTriangle,
  },
  {
    title: 'Review Reports',
    description: 'Moderate reported posts',
    href: '/admin/reports',
    icon: Flag,
  },
  {
    title: 'Manage Foods',
    description: 'Review food database entries',
    href: '/admin/foods',
    icon: UtensilsCrossed,
  },
  {
    title: 'Manage Exercises',
    description: 'Add or edit exercises',
    href: '/admin/exercises',
    icon: Dumbbell,
  },
  {
    title: 'View Payments',
    description: 'Review transactions',
    href: '/admin/payments',
    icon: CreditCard,
  },
  {
    title: 'Audit Logs',
    description: 'Review system activity',
    href: '/admin/audit-logs',
    icon: ReleaseIcon,
  },
  {
    title: 'Compliance',
    description: 'SOC 2 & HIPAA controls',
    href: '/admin/compliance',
    icon: ShieldCheck,
  },
];

// Chart colors - using explicit colors since recharts doesn't support oklch
const getChartColors = (theme: string | undefined) => {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  return {
    primary: '#6366f1', // indigo-500
    secondary: '#0891b2', // cyan-600
    success: '#22c55e', // green-500
    warning: '#f59e0b', // amber-500
    muted: isDark ? '#a1a1aa' : '#71717a', // zinc-400/500
    border: isDark ? '#3f3f46' : '#e4e4e7', // zinc-700/200
    background: isDark ? '#18181b' : '#ffffff', // zinc-900/white
  };
};

export default function AdminDashboard() {
  const { data: statsData, isLoading, error } = useAdminStats();
  const { data: queueHealth } = useQueueHealth();
  const { data: dauData, isLoading: dauLoading } = useAdminDAU(30);
  const { data: dauTodayData } = useAdminDAUToday();
  const { theme } = useTheme();
  const stats = statsData?.data;
  const CHART_COLORS = getChartColors(theme);

  // Check if we have valid chart data
  const hasUserGrowth =
    stats?.userGrowth &&
    Array.isArray(stats.userGrowth) &&
    stats.userGrowth.length > 0 &&
    stats.userGrowth.some((d) => d.users > 0);
  const hasRevenueData =
    stats?.revenueData &&
    Array.isArray(stats.revenueData) &&
    stats.revenueData.length > 0 &&
    stats.revenueData.some((d) => d.revenue > 0);

  const userGrowthRate = (() => {
    if (!stats?.userGrowth || stats.userGrowth.length < 2) {
      return null;
    }

    const latest = Number(
      stats.userGrowth[stats.userGrowth.length - 1]?.users ?? 0,
    );
    const previous = Number(
      stats.userGrowth[stats.userGrowth.length - 2]?.users ?? 0,
    );

    if (!Number.isFinite(latest) || !Number.isFinite(previous)) {
      return null;
    }

    if (previous <= 0) {
      if (latest <= 0) return 0;
      return 100;
    }

    return ((latest - previous) / previous) * 100;
  })();

  const growthIsPositive = (userGrowthRate ?? 0) >= 0;
  const growthColorClass = growthIsPositive ? 'text-green-500' : 'text-red-500';
  const growthLabel =
    userGrowthRate === null
      ? 'N/A'
      : `${growthIsPositive ? '+' : ''}${Math.round(userGrowthRate)}%`;

  // Calculate user distribution for pie chart
  const userDistribution = stats
    ? [
        {
          name: 'Active',
          value: stats.activeUsers,
          color: CHART_COLORS.success,
        },
        {
          name: 'Inactive',
          value: stats.totalUsers - stats.activeUsers,
          color: CHART_COLORS.muted,
        },
      ]
    : [];

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/status">
              <Activity className="h-4 w-4 mr-2" />
              System Status
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : error ? (
          <Card className="col-span-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p>Failed to load statistics</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalUsers.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp
                    className={`h-3 w-3 ${growthColorClass} ${growthIsPositive ? '' : 'rotate-180'}`}
                  />
                  <span className={`font-medium ${growthColorClass}`}>
                    {growthLabel}
                  </span>
                  <span>
                    {userGrowthRate === null
                      ? 'insufficient month data'
                      : 'from last month'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenue (MTD)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {(stats?.thisMonthRevenue ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {(() => {
                    const last = stats?.lastMonthRevenue ?? 0;
                    if (last === 0) return <span>No prior month data</span>;
                    const pct = Math.round(
                      (((stats?.thisMonthRevenue ?? 0) - last) / last) * 100,
                    );
                    const positive = pct >= 0;
                    return (
                      <>
                        <TrendingUp
                          className={`h-3 w-3 ${positive ? 'text-green-500' : 'text-red-500 rotate-180'}`}
                        />
                        <span
                          className={`font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}
                        >
                          {positive ? '+' : ''}
                          {pct}%
                        </span>
                        <span>vs last month</span>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Coaches
                </CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalCoaches.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium text-green-500">
                    {stats?.verifiedCoaches}
                  </span>
                  <span>verified</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Incidents
                </CardTitle>
                <AlertTriangle
                  className={`h-4 w-4 ${
                    stats?.openIncidents && stats.openIncidents > 0
                      ? 'text-amber-500'
                      : 'text-muted-foreground'
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.openIncidents}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {stats?.openIncidents === 0 ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">All systems normal</span>
                    </>
                  ) : (
                    <span>Requires attention</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* User Growth Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">User Growth</CardTitle>
            <CardDescription>New user registrations over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : hasUserGrowth ? (
              <ChartContainer className="h-[250px]">
                <AreaChart data={stats!.userGrowth}>
                  <defs>
                    <linearGradient
                      id="userGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={CHART_COLORS.primary}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke={CHART_COLORS.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={CHART_COLORS.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.background,
                      border: `1px solid ${CHART_COLORS.border}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill="url(#userGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground text-center">
                <p>No user registrations in the last 6 months</p>
                <p className="text-xs mt-1">
                  {!stats?.userGrowth ? '(Backend may need restart)' : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Status</CardTitle>
            <CardDescription>Active vs inactive users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats ? (
              <>
                <ChartContainer className="h-[200px]">
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: CHART_COLORS.background,
                        border: `1px solid ${CHART_COLORS.border}`,
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {userDistribution.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Daily Active Users */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Active Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Today
            </CardTitle>
            <CardDescription>Users with session activity today</CardDescription>
          </CardHeader>
          <CardContent>
            {dauTodayData?.data && dauTodayData.data.length > 0 ? (
              <ul className="space-y-2">
                {dauTodayData.data.map((u) => (
                  <li key={u.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-medium">
                      {u.displayName ?? 'Unknown'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm text-center">
                No activity today yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* DAU Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Daily Active Users
            </CardTitle>
            <CardDescription>
              Unique users with session activity per day (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dauLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : dauData?.data &&
              dauData.data.length > 0 &&
              dauData.data.some((d) => d.users > 0) ? (
              <ChartContainer className="h-[250px]">
                <LineChart data={dauData.data}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={CHART_COLORS.muted}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + 'T00:00:00');
                      return d.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      });
                    }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    stroke={CHART_COLORS.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.background,
                      border: `1px solid ${CHART_COLORS.border}`,
                      borderRadius: '8px',
                    }}
                    labelFormatter={(v) => {
                      const d = new Date(String(v) + 'T00:00:00');
                      return d.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke={CHART_COLORS.secondary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      strokeWidth: 0,
                      fill: CHART_COLORS.secondary,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground text-center">
                <p>No session activity in the last 30 days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Content Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Monthly revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : hasRevenueData ? (
              <ChartContainer className="h-[200px]">
                <BarChart data={stats.revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.border}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke={CHART_COLORS.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={CHART_COLORS.muted}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.background,
                      border: `1px solid ${CHART_COLORS.border}`,
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={CHART_COLORS.success}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-center">
                <p>No revenue in the last 6 months</p>
                <p className="text-xs mt-1">
                  {!stats?.revenueData ? '(Backend may need restart)' : ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Stats */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content Overview
              </CardTitle>
              <Link to="/admin/blogs">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Manage
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {stats?.totalBlogPosts || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <p className="text-2xl font-bold text-green-500">
                  {stats?.publishedBlogPosts || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Published</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <p className="text-2xl font-bold text-amber-500">
                  {(stats?.totalBlogPosts || 0) -
                    (stats?.publishedBlogPosts || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Drafts</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Publication Rate</span>
                <span className="font-medium">
                  {stats?.totalBlogPosts
                    ? Math.round(
                        (stats.publishedBlogPosts / stats.totalBlogPosts) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-green-500 to-emerald-400 transition-all"
                  style={{
                    width: `${
                      stats?.totalBlogPosts
                        ? (stats.publishedBlogPosts / stats.totalBlogPosts) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coaching, Food Database, Worker Health */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Coaching */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Coaching
              </CardTitle>
              <Link to="/admin/coaches">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Bookings</span>
              <span className="font-medium">
                {(stats?.coaching?.activeBookings ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active Packages</span>
              <span className="font-medium">
                {(stats?.coaching?.totalPackages ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contract Signatures</span>
              <span className="font-medium">
                {(stats?.coaching?.contractSignatures ?? 0).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Food Database */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Food Database
              </CardTitle>
              <Link to="/admin/foods">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  View
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Foods</span>
              <span className="font-bold text-lg">
                {(stats?.foodDatabase?.totalFoods ?? 0).toLocaleString()}
              </span>
            </div>
            {stats?.foodDatabase?.bySource &&
              Object.entries(stats.foodDatabase.bySource).length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-border">
                  {Object.entries(stats.foodDatabase.bySource)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <div
                        key={source}
                        className="flex items-center justify-between text-xs"
                      >
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono"
                        >
                          {source}
                        </Badge>
                        <span className="text-muted-foreground font-mono">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Worker / Queue Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Worker Queues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {queueHealth ? (
              Object.entries(queueHealth).map(([queue, depth]) => (
                <div
                  key={queue}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground font-mono text-xs">
                    {queue}
                  </span>
                  <Badge
                    variant={depth > 0 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {depth === -1
                      ? 'N/A'
                      : depth === 0
                        ? 'Empty'
                        : `${depth} msgs`}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Unable to reach RabbitMQ</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <Link to="/admin/audit-logs">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                All logs
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {stats.recentActivity.map((item: RecentActivityItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-1.5 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ActionBadge action={item.action} />
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        <span className="font-medium">{item.resource}</span>
                        {item.resourceId && (
                          <span className="text-muted-foreground ml-1 text-xs font-mono">
                            {item.resourceId.slice(0, 8)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.user?.displayName ?? item.user?.email ?? 'System'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions & Compliance */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <Link key={action.href} to={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="p-2 rounded-md bg-primary/10">
                      <action.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">SOC2 Type II</span>
              </div>
              {(() => {
                const c = stats?.compliance;
                const allActive =
                  c?.dataEncryption?.active &&
                  c?.auditLogging?.active &&
                  c?.wormStorage?.active;
                return (
                  <Badge
                    variant="default"
                    className={
                      allActive
                        ? 'bg-green-500 text-xs'
                        : 'bg-amber-500 text-xs'
                    }
                  >
                    {allActive ? 'Controls Active' : 'Controls Partial'}
                  </Badge>
                );
              })()}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-purple-500" />
                <span className="text-sm">HIPAA</span>
              </div>
              {(() => {
                const c = stats?.compliance;
                const allActive =
                  c?.dataEncryption?.active &&
                  c?.consentTracking?.enabled &&
                  c?.auditLogging?.active;
                return (
                  <Badge
                    variant="default"
                    className={
                      allActive
                        ? 'bg-green-500 text-xs'
                        : 'bg-amber-500 text-xs'
                    }
                  >
                    {allActive ? 'Controls Active' : 'Controls Partial'}
                  </Badge>
                );
              })()}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Data Encryption</span>
              </div>
              <Badge
                variant="default"
                className={
                  stats?.compliance?.dataEncryption?.active
                    ? 'bg-green-500 text-xs'
                    : 'bg-red-500 text-xs'
                }
              >
                {stats?.compliance?.dataEncryption?.active
                  ? 'Active'
                  : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-teal-500" />
                <span className="text-sm">WORM Storage</span>
              </div>
              <Badge
                variant="default"
                className={
                  stats?.compliance?.wormStorage?.active
                    ? 'bg-green-500 text-xs'
                    : 'bg-red-500 text-xs'
                }
              >
                {stats?.compliance?.wormStorage?.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                <span className="text-sm">Audit Logging</span>
              </div>
              <Badge
                variant="default"
                className={
                  stats?.compliance?.auditLogging?.active
                    ? 'bg-green-500 text-xs'
                    : 'bg-red-500 text-xs'
                }
              >
                {stats?.compliance?.auditLogging?.active
                  ? 'Active'
                  : 'No Activity'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="text-sm">Consent Tracking</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.compliance?.consentTracking?.totalConsents?.toLocaleString() ??
                  0}{' '}
                records
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-500" />
                <span className="text-sm">Legal Documents</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats?.compliance?.legalDocuments?.active ?? 0} /{' '}
                {stats?.compliance?.legalDocuments?.total ?? 0} active
              </Badge>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                GDPR
              </p>
              <div className="space-y-2">
                <Link
                  to="/admin/audit-logs?action=EXPORT"
                  className="flex items-center justify-between hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Data Exports</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {(
                      stats?.compliance?.gdpr?.dataExports ?? 0
                    ).toLocaleString()}
                  </Badge>
                </Link>
                <Link
                  to="/admin/audit-logs?action=DELETE&resource=User"
                  className="flex items-center justify-between hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Account Deletions</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {(
                      stats?.compliance?.gdpr?.accountDeletions ?? 0
                    ).toLocaleString()}
                  </Badge>
                </Link>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Pending Retentions</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      (stats?.compliance?.gdpr?.pendingRetentions ?? 0) > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs'
                        : 'text-xs'
                    }
                  >
                    {stats?.compliance?.gdpr?.pendingRetentions ?? 0}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <Link
                to="/admin/compliance"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Compliance details
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                to="/admin/audit-logs"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Audit logs
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-600',
  READ: 'bg-sky-500/15 text-sky-600',
  UPDATE: 'bg-amber-500/15 text-amber-600',
  DELETE: 'bg-rose-500/15 text-rose-600',
  LOGIN: 'bg-indigo-500/15 text-indigo-600',
  LOGOUT: 'bg-slate-500/15 text-slate-600',
  EXPORT: 'bg-blue-500/15 text-blue-600',
};

function ActionBadge({ action }: { action: string }) {
  const cls = actionColors[action] ?? 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}
    >
      {action}
    </span>
  );
}
