import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { CurrentUser } from './auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from './auth/strategies/jwt.strategy';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Get('owner')
  @Roles('owner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  ownerOnly(): string {
    return 'Owner access granted';
  }

  @Get('employee')
  @Roles('backoffice_employee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  employeeOnly(): string {
    return 'Employee access granted';
  }
}
