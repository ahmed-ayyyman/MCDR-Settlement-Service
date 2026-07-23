import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from '../schemas/notification.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  // Exported so future feature modules (requests, payments, documents) can
  // inject NotificationsService and call emit() on every status change,
  // per the task list's "Emit notification events on every status change".
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
