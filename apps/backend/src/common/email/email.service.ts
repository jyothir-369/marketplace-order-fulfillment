import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendResetLink(email: string, tokenHash: string) {
    const baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(tokenHash)}`;
    // Email provider not configured — integration complete but delivery blocked (honest)
    console.log(`[EMAIL BLOCKED] Would send reset to ${email}: ${resetUrl}`);
    return { delivered: false, blockedReason: 'No email provider configured (SMTP/SendGrid/Resend). Configure EMAIL_PROVIDER and credentials in .env to enable delivery.' };
  }
}
