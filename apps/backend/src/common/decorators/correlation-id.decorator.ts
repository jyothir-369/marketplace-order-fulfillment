import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_KEY = 'x-correlation-id';

export const CorrelationId = createParamDecorator(
  function(data, ctx) {
    const request = ctx.switchToHttp().getRequest();
    const correlationId = request.headers[CORRELATION_ID_KEY] || request.headers['correlationid'] || uuidv4();
    request.correlationId = correlationId;
    return correlationId;
  },
);