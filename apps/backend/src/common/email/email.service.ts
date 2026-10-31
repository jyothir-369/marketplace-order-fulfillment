import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendResetLink(email: string, rawToken: string): Promise<{ delivered: boolean; providerRequestId?: string; blockedReason?: string }> {
    const provider = process.env.EMAIL_PROVIDER || 'none';
    const from = process.env.EMAIL_FROM || 'noreply@marketplace.local';
    const frontendUrl = (process.env.PUBLIC_APP_URL || 'http://localhost:3000').trim();

    if (!this.isAllowedOrigin(frontendUrl)) {
      this.logger.error('Invalid PUBLIC_APP_URL configured');
      return { delivered: false, blockedReason: 'Invalid frontend origin configured' };
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    if (provider === 'none' || !provider.trim()) {
      this.logger.warn('Email blocked — provider=none');
      return { delivered: false, blockedReason: 'No email provider configured' };
    }

    if (provider !== 'resend') {
      this.logger.error('Unknown provider: ' + provider);
      return { delivered: false, blockedReason: 'Unknown provider: ' + provider };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      this.logger.error('RESEND_API_KEY missing');
      return { delivered: false, blockedReason: 'Resend API key missing' };
    }

    try {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from,
        to: email,
        subject: 'Reset your Marketplace password',
        html: `<p>You requested a password reset.</p>
<p><a href="${resetUrl}">Reset password</a></p>
<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
        text: `Reset your password: ${resetUrl}\nExpires in 1 hour. Ignore if not requested.`,
      });
      if (result.error) {
        this.logger.error('Resend rejected email (provider error returned)');
        return { delivered: false, blockedReason: 'Resend rejected the request' };
      }
      if (result.data?.id) {
        this.logger.log('Resend accepted email (provider request id present)');
        return { delivered: true, providerRequestId: result.data.id };
      }
      this.logger.error('Resend response contained no message id');
      return { delivered: false, blockedReason: 'Resend returned no message id' };
    } catch (err: any) {
      const safeMsg = (err && err.message) ? err.message : 'Provider error';
      // Log only safe classification, never the URL/token/API key/response body
      this.logger.error('Resend delivery failed: ' + (safeMsg.includes('key') ? 'auth error' : 'provider error'));
      return { delivered: false, blockedReason: 'Resend provider error: ' + safeMsg };
    }
  }

  private isAllowedOrigin(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      return (url.protocol === 'http:' || url.protocol === 'https:') && url.host.length > 0;
    } catch {
      return false;
    }
  }
}
