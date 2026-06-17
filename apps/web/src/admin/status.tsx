import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { SuccessResponse } from '@varaperformance/core';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  Loader2,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Types
interface Service {
  id: string;
  name: string;
  description: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'MAINTENANCE';
  uptime: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface IncidentNote {
  id: string;
  incidentId: string;
  message: string;
  createdAt: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
  updates: IncidentNote[];
}

interface ServicesResponse {
  success: boolean;
  data: Service[];
}

interface IncidentsResponse {
  success: boolean;
  data: {
    incidents: Incident[];
    total: number;
  };
}

const statusColors = {
  OPERATIONAL: 'bg-green-500/10 text-green-600 border-green-500/20',
  DEGRADED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  OUTAGE: 'bg-red-500/10 text-red-600 border-red-500/20',
  MAINTENANCE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const incidentStatusColors = {
  INVESTIGATING: 'bg-red-500/10 text-red-600 border-red-500/20',
  IDENTIFIED: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  MONITORING: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  RESOLVED: 'bg-green-500/10 text-green-600 border-green-500/20',
};

export default function StatusManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('incidents');

  // Create Service Dialog
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceStatus, setServiceStatus] =
    useState<Service['status']>('OPERATIONAL');

  // Create Incident Dialog
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentStatus, setIncidentStatus] =
    useState<Incident['status']>('INVESTIGATING');

  // Add Note Dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [noteMessage, setNoteMessage] = useState('');

  // Update Incident Dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [updateStatus, setUpdateStatus] =
    useState<Incident['status']>('INVESTIGATING');

  // Queries
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const response = await api.get<ServicesResponse>('/status/services');
      return response.data;
    },
  });

  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['admin-incidents'],
    queryFn: async () => {
      const response = await api.get<IncidentsResponse>(
        '/status/incidents?limit=50',
      );
      return response.data;
    },
  });

  // Mutations
  const createService = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      status?: string;
    }) => {
      const response = await api.post<SuccessResponse<Service>>(
        '/status/create-service',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setServiceDialogOpen(false);
      setServiceName('');
      setServiceDescription('');
      setServiceStatus('OPERATIONAL');
    },
  });

  const createIncident = useMutation({
    mutationFn: async (data: { title: string; status: string }) => {
      const response = await api.post<SuccessResponse<Incident>>(
        '/status/create-incident',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      setIncidentDialogOpen(false);
      setIncidentTitle('');
      setIncidentStatus('INVESTIGATING');
    },
  });

  const updateIncident = useMutation({
    mutationFn: async (data: {
      id: string;
      status?: string;
      title?: string;
    }) => {
      const response = await api.patch<SuccessResponse<Incident>>(
        '/status/update-incident',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      setUpdateDialogOpen(false);
      setSelectedIncident(null);
    },
  });

  const addNote = useMutation({
    mutationFn: async (data: { incidentId: string; message: string }) => {
      const response = await api.post<SuccessResponse<IncidentNote>>(
        '/status/add-incident-note',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-incidents'] });
      setNoteDialogOpen(false);
      setSelectedIncidentId(null);
      setNoteMessage('');
    },
  });

  const services = servicesData?.data ?? [];
  const incidents = incidentsData?.data?.incidents ?? [];

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Status & Incidents
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage service status and incident reports
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Incidents Tab */}
        <TabsContent value="incidents" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={incidentDialogOpen}
              onOpenChange={setIncidentDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Incident
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Incident</DialogTitle>
                  <DialogDescription>
                    Report a new incident affecting platform services
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., API Response Delays"
                      value={incidentTitle}
                      onChange={(e) => setIncidentTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={incidentStatus}
                      onValueChange={(v) =>
                        setIncidentStatus(v as Incident['status'])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INVESTIGATING">
                          Investigating
                        </SelectItem>
                        <SelectItem value="IDENTIFIED">Identified</SelectItem>
                        <SelectItem value="MONITORING">Monitoring</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIncidentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      createIncident.mutate({
                        title: incidentTitle,
                        status: incidentStatus,
                      })
                    }
                    disabled={!incidentTitle || createIncident.isPending}
                  >
                    {createIncident.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Create Incident
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              {incidentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-semibold">All Systems Operational</h3>
                  <p className="text-sm text-muted-foreground">
                    No active incidents reported
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updates</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">
                          {incident.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'border',
                              incidentStatusColors[incident.status],
                            )}
                          >
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {incident.updates?.length ?? 0} notes
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(
                              new Date(incident.createdAt),
                              'MMM d, HH:mm',
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(
                              new Date(incident.updatedAt),
                              'MMM d, HH:mm',
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setUpdateStatus(incident.status);
                                setUpdateDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedIncidentId(incident.id);
                                setNoteDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Dialog
              open={serviceDialogOpen}
              onOpenChange={setServiceDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                  <DialogDescription>
                    Add a new service to monitor on the status page
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., API Server"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the service"
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-status">Initial Status</Label>
                    <Select
                      value={serviceStatus}
                      onValueChange={(v) =>
                        setServiceStatus(v as Service['status'])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPERATIONAL">Operational</SelectItem>
                        <SelectItem value="DEGRADED">Degraded</SelectItem>
                        <SelectItem value="OUTAGE">Outage</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setServiceDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      createService.mutate({
                        name: serviceName,
                        description: serviceDescription,
                        status: serviceStatus,
                      })
                    }
                    disabled={
                      !serviceName ||
                      !serviceDescription ||
                      createService.isPending
                    }
                  >
                    {createService.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add Service
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              {servicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Server className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No Services</h3>
                  <p className="text-sm text-muted-foreground">
                    Add services to track their status
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">
                          {service.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate">
                          {service.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'border',
                              statusColors[service.status],
                            )}
                          >
                            {service.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {service.uptime.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(
                              new Date(service.updatedAt),
                              'MMM d, HH:mm',
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Incident Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Incident</DialogTitle>
            <DialogDescription>{selectedIncident?.title}</DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={updateStatus}
                  onValueChange={(v) =>
                    setUpdateStatus(v as Incident['status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="IDENTIFIED">Identified</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedIncident.updates &&
                selectedIncident.updates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Timeline</Label>
                    <div className="border rounded-lg p-4 space-y-3 max-h-[200px] overflow-y-auto">
                      {selectedIncident.updates.map((note) => (
                        <div key={note.id} className="flex items-start gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(note.createdAt), 'MMM d, HH:mm')}
                            </p>
                            <p className="text-sm">{note.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedIncident) {
                  updateIncident.mutate({
                    id: selectedIncident.id,
                    status: updateStatus,
                  });
                }
              }}
              disabled={updateIncident.isPending}
            >
              {updateIncident.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Incident Note</DialogTitle>
            <DialogDescription>
              Add an update to the incident timeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Message</Label>
              <Textarea
                id="note"
                placeholder="Describe the update..."
                value={noteMessage}
                onChange={(e) => setNoteMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedIncidentId) {
                  addNote.mutate({
                    incidentId: selectedIncidentId,
                    message: noteMessage,
                  });
                }
              }}
              disabled={!noteMessage || addNote.isPending}
            >
              {addNote.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
