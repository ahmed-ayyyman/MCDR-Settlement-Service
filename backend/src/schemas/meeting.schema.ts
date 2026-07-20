import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SettlementRequest } from './request.schema';

export type MeetingDocument = HydratedDocument<Meeting>;

@Schema({ timestamps: true })
export class Meeting {
  @Prop({ type: Types.ObjectId, ref: SettlementRequest.name, required: true, index: true })
  request_id: Types.ObjectId;

  @Prop({ required: true })
  meeting_date: Date;

  @Prop({ required: true })
  attachment_url: string;

  @Prop({ required: true })
  company_capital_at_meeting: number;

  // Set by the backoffice employee during review — absent (undefined) until
  // then, not 0. Don't default this to 0: a real fee of 0 and "not reviewed
  // yet" need to stay distinguishable.
  @Prop()
  fee?: number;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);
