import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export interface ActiveStack {
  name: string;
  items?: unknown[];
}

export interface InjectionCompliance {
  percent: number;
  actual: number;
  expected: number;
  protocols: number;
}

export function StackComplianceCard({
  activeStack,
  injectionCompliance,
}: {
  activeStack: ActiveStack | null;
  injectionCompliance: InjectionCompliance | null;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <svg
            className="h-4 w-4 text-chart-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          Stack & Injection Compliance
        </CardTitle>
        <CardDescription>Schedule adherence</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {activeStack || injectionCompliance ? (
          <div className="space-y-3">
            {activeStack && (
              <div>
                <p className="text-sm font-medium">{activeStack.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeStack.items?.length ?? 0} items in active stack
                </p>
              </div>
            )}
            {injectionCompliance && (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span>Injection adherence</span>
                  <span>{injectionCompliance.percent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-chart-5"
                    style={{ width: `${injectionCompliance.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {injectionCompliance.actual}/{injectionCompliance.expected}{' '}
                  doses ({injectionCompliance.protocols} protocol
                  {injectionCompliance.protocols !== 1 ? 's' : ''})
                </p>
              </div>
            )}
            {!activeStack && !injectionCompliance && (
              <p className="text-xs text-muted-foreground">
                No compliance data for this period.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed">
            <p className="text-sm font-medium">No active stacks or protocols</p>
            <p className="text-xs text-muted-foreground">
              Set up a supplement stack or injection protocol to track
              compliance.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
