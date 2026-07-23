import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SettlementRequest,
  SettlementRequestSchema,
} from '../schemas/request.schema';
import { Meeting, MeetingSchema } from '../schemas/meeting.schema';
import { Company, CompanySchema } from '../schemas/company.schema';
import { Owner, OwnerSchema } from '../schemas/owner.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SettlementRequest.name, schema: SettlementRequestSchema },
      { name: Meeting.name, schema: MeetingSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Owner.name, schema: OwnerSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
