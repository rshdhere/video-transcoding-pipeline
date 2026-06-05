import { Resend } from "resend";

export type MailConfig = {
  apiKey: string;
  fromEmail: string;
  enabled: boolean;
};

export type VerificationEmailInput = {
  to: string;
  url: string;
};

export function createMailer(config: MailConfig) {
  const resend = config.enabled ? new Resend(config.apiKey) : null;

  return {
    async sendVerificationEmail({ to, url }: VerificationEmailInput) {
      if (!resend) {
        return;
      }

      const { error } = await resend.emails.send({
        from: config.fromEmail,
        to,
        subject: "Verify your email address",
        html: `
          <p>Thanks for signing up. Please verify your email address by clicking the link below:</p>
          <p><a href="${url}">Verify email</a></p>
          <p>If you did not create an account, you can ignore this email.</p>
        `,
        text: `Verify your email address by visiting: ${url}`,
      });

      if (error) {
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    },
  };
}

export type Mailer = ReturnType<typeof createMailer>;
