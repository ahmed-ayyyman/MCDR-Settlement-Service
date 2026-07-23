import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentsService } from './payments.service';
import { SettlementRequest, RequestStatus } from '../schemas/request.schema';
import { Meeting } from '../schemas/meeting.schema';
import { Company } from '../schemas/company.schema';
import { Owner } from '../schemas/owner.schema';
import { NotificationsService } from '../notifications/notifications.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let requestModel: { findById: jest.Mock };
  let meetingModel: { find: jest.Mock };
  let companyModel: { findById: jest.Mock };
  let ownerModel: { findById: jest.Mock };
  let notificationsService: { emit: jest.Mock };

  const requestId = new Types.ObjectId().toString();
  const companyId = new Types.ObjectId();
  const ownerDocId = new Types.ObjectId();
  const callerKeycloakId = 'kc-owner-1';

  const buildRequest = (status: RequestStatus) => ({
    _id: new Types.ObjectId(requestId),
    company_id: companyId,
    status,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    requestModel = { findById: jest.fn() };
    meetingModel = { find: jest.fn() };
    companyModel = { findById: jest.fn() };
    ownerModel = { findById: jest.fn() };
    notificationsService = { emit: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getModelToken(SettlementRequest.name),
          useValue: requestModel,
        },
        { provide: getModelToken(Meeting.name), useValue: meetingModel },
        { provide: getModelToken(Company.name), useValue: companyModel },
        { provide: getModelToken(Owner.name), useValue: ownerModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);

    companyModel.findById.mockResolvedValue({
      _id: companyId,
      owner_id: ownerDocId,
    });
    ownerModel.findById.mockResolvedValue({
      _id: ownerDocId,
      keycloak_id: callerKeycloakId,
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('getPaymentSummary', () => {
    it('throws NotFoundException when the request does not exist', async () => {
      requestModel.findById.mockResolvedValue(null);

      await expect(
        service.getPaymentSummary(requestId, callerKeycloakId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller does not own the company', async () => {
      requestModel.findById.mockResolvedValue(
        buildRequest(RequestStatus.PendingPayment),
      );
      ownerModel.findById.mockResolvedValue({
        _id: ownerDocId,
        keycloak_id: 'someone-else',
      });

      await expect(
        service.getPaymentSummary(requestId, callerKeycloakId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns fee per meeting and the correct total', async () => {
      requestModel.findById.mockResolvedValue(
        buildRequest(RequestStatus.PendingPayment),
      );
      const sort = jest.fn().mockReturnThis();
      const exec = jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          meeting_date: new Date('2026-01-01'),
          fee: 100,
        },
        {
          _id: new Types.ObjectId(),
          meeting_date: new Date('2026-02-01'),
          fee: 250,
        },
        {
          _id: new Types.ObjectId(),
          meeting_date: new Date('2026-03-01'),
          fee: undefined,
        },
      ]);
      meetingModel.find.mockReturnValue({ sort, exec });

      const summary = await service.getPaymentSummary(
        requestId,
        callerKeycloakId,
      );

      expect(summary.totalFee).toBe(350);
      expect(summary.meetings).toHaveLength(3);
      expect(summary.meetings[2].fee).toBe(0);
    });
  });

  describe('simulatePayment', () => {
    it('throws BadRequestException when the request is not PendingPayment', async () => {
      requestModel.findById.mockResolvedValue(
        buildRequest(RequestStatus.UnderReview),
      );

      await expect(
        service.simulatePayment(requestId, callerKeycloakId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when the caller does not own the company', async () => {
      requestModel.findById.mockResolvedValue(
        buildRequest(RequestStatus.PendingPayment),
      );
      ownerModel.findById.mockResolvedValue({
        _id: ownerDocId,
        keycloak_id: 'someone-else',
      });

      await expect(
        service.simulatePayment(requestId, callerKeycloakId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('moves a PendingPayment request to PaymentReview, saves it, and emits a notification', async () => {
      const request = buildRequest(RequestStatus.PendingPayment);
      requestModel.findById.mockResolvedValue(request);
      const sort = jest.fn().mockReturnThis();
      const exec = jest.fn().mockResolvedValue([]);
      meetingModel.find.mockReturnValue({ sort, exec });

      const result = await service.simulatePayment(requestId, callerKeycloakId);

      expect(request.status).toBe(RequestStatus.PaymentReview);
      expect(request.save).toHaveBeenCalled();
      expect(result.status).toBe(RequestStatus.PaymentReview);
      expect(notificationsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientKeycloakId: callerKeycloakId,
          eventType: 'payment.completed',
        }),
      );
    });

    it('does not update the request when the status guard rejects it', async () => {
      const request = buildRequest(RequestStatus.Rejected);
      requestModel.findById.mockResolvedValue(request);

      await expect(
        service.simulatePayment(requestId, callerKeycloakId),
      ).rejects.toThrow(BadRequestException);
      expect(request.save).not.toHaveBeenCalled();
    });
  });
});
