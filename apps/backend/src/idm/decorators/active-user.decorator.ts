import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt.interface';
import { REQUEST_USER_KEY } from '../constants/idm.constants';

export const ActiveUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request[REQUEST_USER_KEY] as JwtPayload | undefined;
    return field ? user?.[field] : user;
  },
);
