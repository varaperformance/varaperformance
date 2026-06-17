import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdminPrivateMode,
  useGenerateAdminRegistrationCodes,
  useUpdateAdminPrivateMode,
} from '@/hooks/use-admin';
import { writeClipboard } from '@/lib/clipboard';

export default function AdminPrivateModePage() {
  const [count, setCount] = useState('1');
  const { data, isLoading } = useAdminPrivateMode();
  const updatePrivateMode = useUpdateAdminPrivateMode();
  const generateCodes = useGenerateAdminRegistrationCodes();

  const privateModeEnabled = Boolean(data?.data?.privateModeEnabled);
  const codes = useMemo(() => data?.data?.codes ?? [], [data?.data?.codes]);

  const stats = useMemo(() => {
    const used = codes.filter((code) => code.usedAt).length;
    return {
      total: codes.length,
      used,
      available: codes.length - used,
    };
  }, [codes]);

  const buildRegistrationCodeLink = (registrationCode: string) =>
    `https://varaperformance.com/register/create?registrationCode=${encodeURIComponent(registrationCode)}`;

  const handleCopyCode = async (value: string) => {
    try {
      await writeClipboard(buildRegistrationCodeLink(value));
      toast.success('Registration link copied');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Private Mode</h1>
          <p className="text-muted-foreground mt-1">
            Require registration codes and manage single-use codes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              When enabled, registration requires a valid, unused code.
            </p>
            <Switch
              checked={privateModeEnabled}
              onCheckedChange={async (checked) => {
                await updatePrivateMode.mutateAsync(checked);
                toast.success(
                  `Private mode ${checked ? 'enabled' : 'disabled'}`,
                );
              }}
              disabled={updatePrivateMode.isPending || isLoading}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Codes</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-xl font-semibold">{stats.available}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Used</p>
                <p className="text-xl font-semibold">{stats.used}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-28"
            />
            <Button
              onClick={async () => {
                const next = Math.max(1, Math.min(200, Number(count || 1)));
                await generateCodes.mutateAsync(next);
                toast.success(`${next} code${next > 1 ? 's' : ''} generated`);
              }}
              disabled={generateCodes.isPending}
            >
              Generate Codes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader>
          <CardTitle>Registration Codes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Loading...
            </p>
          ) : codes.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              No codes generated yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Used By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span>{code.code}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => void handleCopyCode(code.code)}
                          title="Copy registration link"
                          aria-label={`Copy registration link for ${code.code}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{code.usedAt ? 'Used' : 'Available'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {code.ownerUserId ?? '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {code.usedByUserId ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
