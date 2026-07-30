import { Controller, Sse, Req, UseGuards, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('sse')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    const organizationId = req.user.organizationId;
    return this.sseService.subscribe(organizationId);
  }
}
