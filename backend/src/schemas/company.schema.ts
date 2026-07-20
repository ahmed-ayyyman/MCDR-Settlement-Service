import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Owner } from './owner.schema';

export type CompanyDocument = HydratedDocument<Company>;

@Schema({ timestamps: true })
export class Company {
  @Prop({ type: Types.ObjectId, ref: Owner.name, required: true })
  owner_id: Types.ObjectId;

  // Commercial Registration Number — this is what the owner types in to
  // start a request. Unique per company.
  @Prop({ required: true, unique: true })
  crn: string;

  @Prop({ required: true })
  name: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
