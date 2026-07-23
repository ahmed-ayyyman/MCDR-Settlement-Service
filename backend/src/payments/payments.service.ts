import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SettlementRequest,
  SettlementRequestDocument,
  RequestStatus,
} from '../schemas/request.schema';
import { Meeting, MeetingDocument } from '../schemas/meeting.schema';
import { Company, CompanyDocument } from '../schemas/company.schema';
import { Owner, OwnerDocument } from '../schemas/owner.schema';
import { NotificationsService } from '../notifications/notifications.service';

export interface MeetingFeeLine {
  meetingId: string;
  meetingDate: Date;
  fee: number;
}

export interface PaymentSummary {
  requestId: string;
  status: RequestStatus;
  meetings: MeetingFeeLine[];
  totalFee: number;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(SettlementRequest.name)
    private readonly requestModel: Model<SettlementRequestDocument>,
    @InjectModel(Meeting.name)
    private readonly meetingModel: Model<MeetingDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    @InjectModel(Owner.name)
    private readonly ownerModel: Model<OwnerDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Confirms the calling owner actually owns the company behind this
   * request. Never trust a request id alone — always resolve ownership
   * through Company -> Owner -> keycloak_id, per the schema's own guidance
   * on not trusting client-supplied ids.
   */
  private async assertOwnsRequest(
    request: SettlementRequestDocument,
    ownerKeycloakId: string,
  ): Promise<void> {
    const company = await this.companyModel.findById(request.company_id);
    if (!company) {
      throw new NotFoundException('Company for this request no longer exists');
    }

    const owner = await this.ownerModel.findById(company.owner_id);
    if (!owner || owner.keycloak_id !== ownerKeycloakId) {
      throw new ForbiddenException('This request does not belong to you');
    }
  }

  private async buildSummary(
    request: SettlementRequestDocument,
  ): Promise<PaymentSummary> {
    const meetings = await this.meetingModel
      .find({ request_id: request._id })
      .sort({ meeting_date: 1 })
      .exec();

    const lines: MeetingFeeLine[] = meetings.map((m) => ({
      meetingId: m._id.toString(),
      meetingDate: m.meeting_date,
      fee: m.fee ?? 0,
    }));

    const totalFee = lines.reduce((sum, line) => sum + line.fee, 0);

    return {
      requestId: request._id.toString(),
      status: request.status,
      meetings: lines,
      totalFee,
    };
  }

  async getPaymentSummary(
    requestId: string,
    ownerKeycloakId: string,
  ): Promise<PaymentSummary> {
    const request = await this.requestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Settlement request not found');
    }

    await this.assertOwnsRequest(request, ownerKeycloakId);

    return this.buildSummary(request);
  }

  /**
   * Simulated payment — no real payment gateway. Marks the request as paid
   * by moving it to PaymentReview (awaiting backoffice to close it out),
   * per the status flow already agreed in request.schema.ts.
   */
  async simulatePayment(
    requestId: string,
    ownerKeycloakId: string,
  ): Promise<PaymentSummary> {
    const request = await this.requestModel.findById(requestId);
    if (!request) {
      throw new NotFoundException('Settlement request not found');
    }

    await this.assertOwnsRequest(request, ownerKeycloakId);

    // Guard from the task list: payment is only allowed while the request
    // is actually awaiting payment. Never trust the frontend to hide the
    // "Pay" button as the only protection against paying twice or paying
    // before approval.
    if (request.status !== RequestStatus.PendingPayment) {
      throw new BadRequestException(
        `Payment is not allowed while the request is in status "${request.status}"`,
      );
    }

    request.status = RequestStatus.PaymentReview;
    await request.save();

    // Fire-and-forget: a notification failure must never block the payment
    // itself, which has already been recorded above.
    void this.notificationsService.emit({
      recipientKeycloakId: ownerKeycloakId,
      eventType: 'payment.completed',
      message: 'Your payment was received and is now under review.',
      relatedRequestId: request._id.toString(),
    });

    return this.buildSummary(request);
  }
}
