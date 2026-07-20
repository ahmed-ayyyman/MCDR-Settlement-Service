import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Company } from './company.schema';
import { Employee } from './employee.schema';

// Pulled directly from the flowchart image the team already drew.
// "Re-upload" isn't its own persisted status — it's the owner replacing a
// rejected receipt, which lands the request back on PendingPayment.
export enum RequestStatus {
  Submitted = 'Submitted',
  UnderReview = 'UnderReview',
  Rejected = 'Rejected',
  PendingPayment = 'PendingPayment',
  PaymentReview = 'PaymentReview',
  PendingSettlementDocs = 'PendingSettlementDocs',
  Closed = 'Closed',
}

export type SettlementRequestDocument = HydratedDocument<SettlementRequest>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class SettlementRequest {
  @Prop({ type: Types.ObjectId, ref: Company.name, required: true, index: true })
  company_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: RequestStatus,
    default: RequestStatus.Submitted,
    required: true,
    index: true,
  })
  status: RequestStatus;

  @Prop({ type: Types.ObjectId, ref: Employee.name })
  reviewed_by_employee_id?: Types.ObjectId;

  @Prop()
  reviewed_by_employee_name?: string;

  @Prop({ type: Types.ObjectId, ref: Employee.name })
  receipt_reviewed_by_employee_id?: Types.ObjectId;

  @Prop()
  receipt_reviewed_by_employee_name?: string;

  @Prop()
  receipt_file_url?: string;

  @Prop({ default: 0 })
  total_fee: number;
}

export const SettlementRequestSchema = SchemaFactory.createForClass(SettlementRequest);

// Cross-cutting rule from the task list: only one active (non-final) request
// per company at a time. Final states are Rejected and Closed, so "active"
// means status not in that set. Enforce this in the service layer with a
// query before create — a partial index can't express "not equal to two
// values" cleanly, so this stays an application-level check, not a DB
// constraint. Leaving the note here so it isn't lost.
