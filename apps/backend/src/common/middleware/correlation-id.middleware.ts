import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      req.headers['x-correlation-id'] ||
      req.headers['correlationid'] ||
      uuidv4();
    req.correlationId = correlationId as string;
    next();
  }
}declare global { namespace Express { interface Request { correlationId?: string } } }
