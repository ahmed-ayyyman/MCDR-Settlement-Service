import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Owner, OwnerSchema } from '../schemas/owner.schema';
import { Company, CompanySchema } from '../schemas/company.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import {
  SettlementRequest,
  SettlementRequestSchema,
} from '../schemas/request.schema';
import { Meeting, MeetingSchema } from '../schemas/meeting.schema';
import {
  SettlementDocument,
  SettlementDocumentSchema,
} from '../schemas/settlement-document.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([
      { name: Owner.name, schema: OwnerSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: SettlementRequest.name, schema: SettlementRequestSchema },
      { name: Meeting.name, schema: MeetingSchema },
      { name: SettlementDocument.name, schema: SettlementDocumentSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
