import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

export var CORRELATION_ID_KEY = 'x-correlation-id';

export var CorrelationId = createParamDecorator(
  function(data, ctx) {
    var request = ctx.switchToHttp().getRequest();
    var correlationId = request.headers[CORRELATION_ID_KEY] || request.headers['correlationid'] || uuidv4();
    request.correlationId = correlationId;
    return correlationId;
  },
);