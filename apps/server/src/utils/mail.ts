import { Resend } from "resend";
import { RESEND_API_KEY, RESEND_MAIL_ID, CORS_ORIGINS } from "../config";

const resend = new Resend(RESEND_API_KEY);

const sendEmailVerificationLink = async (email: string, token: string) => {
  const { data, error } = await resend.emails.send({
    from: RESEND_MAIL_ID!,
    to: email,
    subject: "Verify your email",
    html: `<a href="${CORS_ORIGINS?.split(",")[0]}/auth/verify-email?token=${token}">Click here to verify your email</a>`,
  });

  if (error) {
    throw new Error("[mailUtil:sendEmailVerificationLink] => Error sending verification mail");
  }

  return data;
};

export { sendEmailVerificationLink };
