import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('requests/:id')
@Roles('owner')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('payment-summary')
  getSummary(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.getPaymentSummary(id, user.id);
  }

  @Post('pay')
  pay(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.simulatePayment(id, user.id);
  }
}
