import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from '../schemas/notification.schema';

type MockNotificationModel = {
  create: jest.Mock;
  find: jest.Mock;
  findById: jest.Mock;
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationModel: MockNotificationModel;

  beforeEach(async () => {
    mockNotificationModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('emit', () => {
    it('creates a notification record with the given fields', async () => {
      mockNotificationModel.create.mockResolvedValue({});

      await service.emit({
        recipientKeycloakId: 'kc-owner-1',
        eventType: 'request.submitted',
        message: 'Your request was submitted.',
        relatedRequestId: '507f1f77bcf86cd799439011',
      });

      expect(mockNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_keycloak_id: 'kc-owner-1',
          event_type: 'request.submitted',
          message: 'Your request was submitted.',
          related_request_id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        }),
      );
    });

    it('omits related_request_id when none is given', async () => {
      mockNotificationModel.create.mockResolvedValue({});

      await service.emit({
        recipientKeycloakId: 'kc-owner-1',
        eventType: 'request.submitted',
        message: 'Your request was submitted.',
      });

      expect(mockNotificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ related_request_id: undefined }),
      );
    });

    it('does not throw when the underlying write fails (fire-and-forget)', async () => {
      mockNotificationModel.create.mockRejectedValue(
        new Error('Mongo is down'),
      );

      await expect(
        service.emit({
          recipientKeycloakId: 'kc-owner-1',
          eventType: 'request.submitted',
          message: 'Your request was submitted.',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findForUser', () => {
    it('queries by recipient and sorts newest first', async () => {
      const sort = jest.fn().mockReturnThis();
      const exec = jest.fn().mockResolvedValue(['notif-1', 'notif-2']);
      mockNotificationModel.find.mockReturnValue({ sort, exec });

      const result = await service.findForUser('kc-owner-1');

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        recipient_keycloak_id: 'kc-owner-1',
      });
      expect(sort).toHaveBeenCalledWith({ created_at: -1 });
      expect(result).toEqual(['notif-1', 'notif-2']);
    });
  });

  describe('markAsRead', () => {
    it('throws NotFoundException when the notification does not exist', async () => {
      mockNotificationModel.findById.mockResolvedValue(null);

      await expect(service.markAsRead('some-id', 'kc-owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the notification belongs to someone else', async () => {
      mockNotificationModel.findById.mockResolvedValue({
        recipient_keycloak_id: 'kc-someone-else',
        save: jest.fn(),
      });

      await expect(service.markAsRead('some-id', 'kc-owner-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('marks the notification read and saves it for the rightful owner', async () => {
      const notification: {
        recipient_keycloak_id: string;
        read: boolean;
        read_at?: Date;
        save: jest.Mock;
      } = {
        recipient_keycloak_id: 'kc-owner-1',
        read: false,
        read_at: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockNotificationModel.findById.mockResolvedValue(notification);

      const result = await service.markAsRead('some-id', 'kc-owner-1');

      expect(notification.read).toBe(true);
      expect(notification.read_at).toBeInstanceOf(Date);
      expect(notification.save).toHaveBeenCalled();
      expect(result).toBe(notification);
    });
  });
});
