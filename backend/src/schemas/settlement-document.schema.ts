import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Meeting } from './meeting.schema';

export type SettlementDocumentDocument = HydratedDocument<SettlementDocument>;

@Schema()
export class SettlementDocument {
  @Prop({
    type: Types.ObjectId,
    ref: Meeting.name,
    required: true,
    index: true,
  })
  meeting_id: Types.ObjectId;

  @Prop({ required: true })
  document_url: string;

  @Prop({ default: () => new Date() })
  uploaded_at: Date;
}

export const SettlementDocumentSchema =
  SchemaFactory.createForClass(SettlementDocument);

// Task list rule: "when all meetings have a document, the request reaches
// its final settled state." That's a derived check (count settlement docs
// per request_id vs count meetings per request_id), not something to store
// redundantly on the request — keep it computed in the service layer so it
// can never drift out of sync.
