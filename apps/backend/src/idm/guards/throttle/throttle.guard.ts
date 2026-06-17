import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { REQUEST_USER_KEY } from '../../constants/idm.constants';

// Key is THROTTLER:SKIP + throttler name (default = "default")
const THROTTLER_SKIP_DEFAULT = 'THROTTLER:SKIPdefault';

@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for @SkipThrottle() decorator on handler or class
    const handler = context.getHandler();
    const classRef = context.getClass();

    const handlerSkip = Reflect.getMetadata(THROTTLER_SKIP_DEFAULT, handler);
    const classSkip = Reflect.getMetadata(THROTTLER_SKIP_DEFAULT, classRef);

    if (handlerSkip || classSkip) {
      return true;
    }

    return super.canActivate(context);
  }

  protected getTracker(req: Request): Promise<string> {
    // Authenticated → user-based
    const user = req[REQUEST_USER_KEY] as { sub?: string } | undefined;
    if (user?.sub) {
      return Promise.resolve(`user:${user.sub}`);
    }

    // Public / auth → IP-based
    return Promise.resolve(`ip:${req.ip}`);
  }
}
