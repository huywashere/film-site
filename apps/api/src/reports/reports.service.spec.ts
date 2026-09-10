import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('stores a contact message and creates an admin notification', async () => {
    const issueReportCreate = jest.fn().mockResolvedValue({
      id: 'contact-1',
      status: 'NEW',
      priority: 'HIGH',
      createdAt: new Date(),
    });
    const adminNotificationCreate = jest.fn().mockResolvedValue({ id: 'notification-1' });
    const prisma = {
      $transaction: jest.fn((callback) =>
        callback({
          issueReport: { create: issueReportCreate },
          adminNotification: { create: adminNotificationCreate },
        }),
      ),
    };
    const service = new ReportsService(prisma as never);

    const result = await service.createContact({
      topic: 'dmca',
      name: '  Nguyễn Văn A  ',
      email: 'OWNER@EXAMPLE.COM',
      subject: '  Yêu cầu bản quyền  ',
      message: '  Nội dung yêu cầu bản quyền hợp lệ.  ',
    });

    expect(result.id).toBe('contact-1');
    expect(issueReportCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'contact',
          filmTitle: 'Yêu cầu bản quyền',
          serverName: 'dmca',
          deviceInfo: 'Người gửi: Nguyễn Văn A',
          description: 'Nội dung yêu cầu bản quyền hợp lệ.',
          email: 'owner@example.com',
          priority: 'HIGH',
        }),
      }),
    );
    expect(adminNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'contact_message',
          link: '/reports?report=contact-1',
        }),
      }),
    );
  });
});
