import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';

export interface EmitNotificationInput {
  recipientKeycloakId: string;
  eventType: string;
  message: string;
  relatedRequestId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Fire-and-forget by design (cross-cutting rule from the task list):
   * a failure to write a notification must never block the business
   * action that triggered it (approve, pay, upload, etc). Callers should
   * NOT await this in a way that lets it throw into their flow — this
   * method swallows and logs its own errors so they don't have to.
   */
  async emit(input: EmitNotificationInput): Promise<void> {
    try {
      await this.notificationModel.create({
        recipient_keycloak_id: input.recipientKeycloakId,
        event_type: input.eventType,
        message: input.message,
        related_request_id: input.relatedRequestId
          ? new Types.ObjectId(input.relatedRequestId)
          : undefined,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write notification (event=${input.eventType}, recipient=${input.recipientKeycloakId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      // Deliberately not rethrown — see method doc comment.
    }
  }

  async findForUser(
    recipientKeycloakId: string,
  ): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ recipient_keycloak_id: recipientKeycloakId })
      .sort({ created_at: -1 })
      .exec();
  }

  async markAsRead(
    notificationId: string,
    recipientKeycloakId: string,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipient_keycloak_id !== recipientKeycloakId) {
      throw new ForbiddenException('This notification does not belong to you');
    }

    notification.read = true;
    notification.read_at = new Date();
    await notification.save();

    return notification;
  }
}
