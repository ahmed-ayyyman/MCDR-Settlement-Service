import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SettlementRequest } from './request.schema';

export type NotificationDocument = HydratedDocument<Notification>;

// Recipients are identified by their Keycloak subject id (the same value
// CurrentUser() exposes as `user.id`), not by an Owner/Employee ObjectId.
// This keeps the notifications module decoupled from which role the
// recipient is — either owner or backoffice_employee can end up here, and
// the service never needs to know which schema to look them up in.
@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Notification {
  @Prop({ required: true, index: true })
  recipient_keycloak_id: string;

  // Free-form for now, e.g. 'request.submitted', 'request.approved',
  // 'request.rejected', 'payment.completed', 'document.uploaded'. Not an
  // enum yet — the request status model itself is still being agreed on
  // by the team, so this stays a string until that settles.
  @Prop({ required: true })
  event_type: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: SettlementRequest.name })
  related_request_id?: Types.ObjectId;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  read_at?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
