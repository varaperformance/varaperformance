import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Database,
  Globe,
  Smartphone,
  Clock,
  RefreshCw,
  Loader2,
  CreditCard,
  Cpu,
  Mail,
  Zap,
} from 'lucide-react';
import api from '@/lib/api';

// API Response types (matching backend schemas)
type ServiceStatusType = 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'MAINTENANCE';
type IncidentStatusType =
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'MONITORING'
  | 'RESOLVED';

interface ApiService {
  id: string;
  name: string;
  description: string;
  status: ServiceStatusType;
  uptime: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiIncidentNote {
  id: string;
  incidentId: string;
  message: string;
  createdAt: string;
}

interface ApiIncident {
  id: string;
  title: string;
  status: IncidentStatusType;
  createdAt: string;
  updatedAt: string;
  updates: ApiIncidentNote[];
}

// UI types
interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  icon: React.ReactNode;
  uptime: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  date: string;
  updates: {
    time: string;
    message: string;
  }[];
}

// Icon mapping based on service name keywords
const getServiceIcon = (name: string): React.ReactNode => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('web') || lowerName.includes('frontend')) {
    return <Globe className="h-5 w-5" />;
  }
  if (lowerName.includes('api') || lowerName.includes('server')) {
    return <Server className="h-5 w-5" />;
  }
  if (lowerName.includes('database') || lowerName.includes('db')) {
    return <Database className="h-5 w-5" />;
  }
  if (lowerName.includes('cache')) {
    return <Zap className="h-5 w-5" />;
  }
  if (lowerName.includes('message') || lowerName.includes('queue')) {
    return <Mail className="h-5 w-5" />;
  }
  if (lowerName.includes('payment')) {
    return <CreditCard className="h-5 w-5" />;
  }
  if (lowerName.includes('ai')) {
    return <Cpu className="h-5 w-5" />;
  }
  if (lowerName.includes('mobile') || lowerName.includes('app')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (lowerName.includes('sync') || lowerName.includes('realtime')) {
    return <Activity className="h-5 w-5" />;
  }
  if (lowerName.includes('integration')) {
    return <RefreshCw className="h-5 w-5" />;
  }
  return <Server className="h-5 w-5" />;
};

// Transform API service to UI format
const transformService = (service: ApiService): ServiceStatus => ({
  id: service.id,
  name: service.name,
  description: service.description,
  status: service.status.toLowerCase() as ServiceStatus['status'],
  icon: getServiceIcon(service.name),
  uptime: `${service.uptime.toFixed(2)}%`,
});

// Transform API incident to UI format
const transformIncident = (incident: ApiIncident): Incident => ({
  id: incident.id,
  title: incident.title,
  status: incident.status.toLowerCase() as Incident['status'],
  date: new Date(incident.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  updates: incident.updates.map((note) => ({
    time: new Date(note.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    message: note.message,
  })),
});

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedIncidentsResponse {
  incidents: ApiIncident[];
  total: number;
  limit: number;
  offset: number;
}

// API functions
const fetchServices = async (): Promise<ServiceStatus[]> => {
  const response = await api.get<ApiResponse<ApiService[]>>('/status/services');
  return response.data.data.map(transformService);
};

const fetchIncidents = async (): Promise<Incident[]> => {
  const response =
    await api.get<ApiResponse<PaginatedIncidentsResponse>>('/status/incidents');
  return response.data.data.incidents.map(transformIncident);
};

const StatusPage = () => {
  // Fetch services
  const {
    data: services = [],
    isLoading: servicesLoading,
    error: servicesError,
  } = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    staleTime: 30_000, // Consider fresh for 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });

  // Fetch incidents
  const {
    data: recentIncidents = [],
    isLoading: incidentsLoading,
    error: incidentsError,
  } = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const isLoading = servicesLoading || incidentsLoading;
  const hasError = servicesError || incidentsError;

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'outage':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <Clock className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'outage':
        return 'Service Outage';
      case 'maintenance':
        return 'Under Maintenance';
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'outage':
        return 'text-red-500';
      case 'maintenance':
        return 'text-blue-500';
    }
  };

  const getIncidentStatusBadge = (status: Incident['status']) => {
    switch (status) {
      case 'investigating':
        return (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-500">
            Investigating
          </span>
        );
      case 'identified':
        return (
          <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-500">
            Identified
          </span>
        );
      case 'monitoring':
        return (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-500">
            Monitoring
          </span>
        );
      case 'resolved':
        return (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
            Resolved
          </span>
        );
    }
  };

  const allOperational =
    services.length > 0 && services.every((s) => s.status === 'operational');
  const activeIncidentCount = recentIncidents.filter(
    (i) => i.status !== 'resolved',
  ).length;
  const averageUptime =
    services.length > 0
      ? (
          services.reduce((sum, s) => sum + parseFloat(s.uptime), 0) /
          services.length
        ).toFixed(2)
      : '--';

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="h-12 w-12 text-red-500" />
          <p className="text-lg font-medium">Unable to load status</p>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Activity className="h-4 w-4" />
              System Status
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight">
              Service Status
            </h1>

            {/* Overall Status */}
            <div
              className={`mx-auto inline-flex items-center gap-3 rounded-2xl border px-6 py-4 ${
                allOperational
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-yellow-500/30 bg-yellow-500/10'
              }`}
            >
              {allOperational ? (
                <>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="text-left">
                    <div className="font-semibold text-green-500">
                      All Systems Operational
                    </div>
                    <div className="text-sm text-muted-foreground">
                      All services are running smoothly
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <div className="text-left">
                    <div className="font-semibold text-yellow-500">
                      Some Services Affected
                    </div>
                    <div className="text-sm text-muted-foreground">
                      We're working to resolve issues
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Service Status Grid */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold">Current Status</h2>
            {services.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
                <Server className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No services configured yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        {service.icon}
                      </div>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {service.uptime} uptime
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(service.status)}
                        <span
                          className={`text-sm font-medium ${getStatusColor(
                            service.status,
                          )}`}
                        >
                          {getStatusText(service.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Uptime Stats */}
      <section className="py-10">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-primary/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
                <Activity className="mb-3 h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">
                  {averageUptime}
                  {averageUptime !== '--' ? '%' : ''}
                </div>
                <div className="text-sm text-muted-foreground">Avg Uptime</div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-primary/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
                <Server className="mb-3 h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{services.length}</div>
                <div className="text-sm text-muted-foreground">
                  Services Monitored
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-green-500/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-green-500/5 transition-transform group-hover:scale-150" />
                <Clock className="mb-3 h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold text-green-500">
                  &lt;50ms
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Response Time
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-colors hover:border-yellow-500/30">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-yellow-500/5 transition-transform group-hover:scale-150" />
                <AlertTriangle className="mb-3 h-5 w-5 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-500">
                  {activeIncidentCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Incidents
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-2xl font-bold">Recent Incidents</h2>

            {recentIncidents.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <p className="text-muted-foreground">
                  No incidents reported in the last 30 days.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-border/50 bg-card p-6"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {incident.date}
                        </p>
                      </div>
                      {getIncidentStatusBadge(incident.status)}
                    </div>
                    <div className="space-y-3 border-l-2 border-border pl-4">
                      {incident.updates.map((update, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-5.25 top-1.5 h-2 w-2 rounded-full bg-border" />
                          <div className="text-xs text-muted-foreground">
                            {update.time}
                          </div>
                          <div className="text-sm">{update.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Activity className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h2 className="mb-4 text-2xl font-bold">Stay Informed</h2>
            <p className="mb-6 text-muted-foreground">
              Get notified about service status updates and scheduled
              maintenance. Follow us on social media or subscribe to our status
              updates.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Subscribe to Updates
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
                View Incident History
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatusPage;
