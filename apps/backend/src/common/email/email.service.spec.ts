import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(),
      },
    })),
  };
});

describe('EmailService sendResetLink', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();
    service = module.get<EmailService>(EmailService);
    // Mock env defaults for each test
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'test@marketplace.local';
    process.env.PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    delete (process.env as any).EMAIL_PROVIDER;
    delete (process.env as any).RESEND_API_KEY;
    delete (process.env as any).EMAIL_FROM;
    delete (process.env as any).PUBLIC_APP_URL;
  });

  it('should return delivered true when Resend accepts', async () => {
    const mockSend = jest.fn().mockResolvedValue({ data: { id: 'resend-id-123' }, error: null });
    // Preserved: dynamic reload of mocked Resend for per-test mockImplementationOnce (jest.mock + reset).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resend } = require('resend');
    (Resend as any).mockImplementationOnce(() => ({ emails: { send: mockSend } }));

    const result = await service.sendResetLink('user@test.local', 'raw-token-abc');
    expect(result.delivered).toBe(true);
    expect(result.providerRequestId).toBe('resend-id-123');
    expect(mockSend).toHaveBeenCalled();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe('user@test.local');
    expect(call.subject).toContain('Reset');
    expect(call.html).toContain('reset-password');
  });

  it('should return blocked when provider missing', async () => {
    process.env.EMAIL_PROVIDER = 'none';
    const result = await service.sendResetLink('user@test.local', 't');
    expect(result.delivered).toBe(false);
    expect(result.blockedReason).toMatch(/No email provider/);
  });

  it('should reject missing RESEND_API_KEY', async () => {
    process.env.RESEND_API_KEY = '';
    process.env.EMAIL_PROVIDER = 'resend';
    const result = await service.sendResetLink('user@test.local', 't');
    expect(result.delivered).toBe(false);
    expect(result.blockedReason).toMatch(/key missing/i);
  });

  it('should reject invalid frontend origin', async () => {
    process.env.PUBLIC_APP_URL = 'not-a-url';
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.RESEND_API_KEY = 'test-key';
    const result = await service.sendResetLink('user@test.local', 't');
    expect(result.delivered).toBe(false);
    expect(result.blockedReason).toMatch(/Invalid frontend/);
  });

  it('should handle provider error safely', async () => {
    const mockSend = jest.fn().mockRejectedValue(new Error('provider down'));
    // Preserved: per-test Resend reload with mockImplementationOnce.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resend } = require('resend');
    (Resend as any).mockImplementationOnce(() => ({ emails: { send: mockSend } }));

    const result = await service.sendResetLink('user@test.local', 't');
    expect(result.delivered).toBe(false);
    expect(result.blockedReason).toMatch(/provider error/);
  });

  it('should never log token or URL (verified by spy absence)', async () => {
    const spy = jest.spyOn((service as any).logger, 'log');
    const mockSend = jest.fn().mockResolvedValue({ id: 'x' });
    // Preserved: per-test Resend reload with mockImplementationOnce.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resend } = require('resend');
    (Resend as any).mockImplementationOnce(() => ({ emails: { send: mockSend } }));
    await service.sendResetLink('a@b.c', 'tok');
    const msg = spy.mock.calls.map((c: any) => String(c[0])).join(' ');
    expect(msg).not.toContain('tok');
    expect(msg).not.toContain('reset-password');
    spy.mockRestore();
  });
});
