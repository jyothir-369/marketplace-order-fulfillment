"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationId = exports.CORRELATION_ID_KEY = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
exports.CORRELATION_ID_KEY = 'x-correlation-id';
exports.CorrelationId = (0, common_1.createParamDecorator)(function (data, ctx) {
    var request = ctx.switchToHttp().getRequest();
    var correlationId = request.headers[exports.CORRELATION_ID_KEY] || request.headers['correlationid'] || (0, uuid_1.v4)();
    request.correlationId = correlationId;
    return correlationId;
});
//# sourceMappingURL=correlation-id.decorator.js.map