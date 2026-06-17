import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <ShieldX className="h-20 w-20 text-muted-foreground" />
      <h1 className="mt-6 text-4xl font-bold">Access Denied</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        You don't have permission to access this page. If you believe this is an
        error, please contact support.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
}
