import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OwnerDocument = HydratedDocument<Owner>;

@Schema({ timestamps: true })
export class Owner {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  // Subject id returned by Keycloak on login — this is how we link a
  // logged-in user back to their Owner record. Never trust a client-supplied
  // owner id; always resolve it from the token's keycloak_id.
  @Prop({ required: true, unique: true })
  keycloak_id: string;
}

export const OwnerSchema = SchemaFactory.createForClass(Owner);
