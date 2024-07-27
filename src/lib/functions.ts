import * as CryptoJS from "crypto-js";
import dorenv from "dotenv";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
dorenv.config();

export interface MailOptionsInterface {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export const decryptDetails = (data: string) => {
  if (data) {
    const bytes = CryptoJS.AES.decrypt(
      data.toString(),
      process.env.SECRET_KEY!
    );
    //@ts-ignore
    const result = bytes.toString(CryptoJS.enc.Utf8).replace("|", /\\/g);
    return result;
  } else {
    return null;
  }
};

/**
 * async function for encrypting the tokens and id details
 */
export const encryptDetails = (data: string) => {
  if (data) {
    const text = CryptoJS.AES.encrypt(
      data.toString(),
      process.env.SECRET_KEY!
    ).toString();
    return text.replace(/\\/g, "|");
  } else {
    return null;
  }
};

export const sendMail = ({ from, html, subject, to }: MailOptionsInterface) => {
  let mailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "montra.service@gmail.com",
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions: MailOptionsInterface = {
    from: "montra.service@gmail.com",
    to: to,
    subject: subject,
    html: html,
  };

  mailTransporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log(err.message);
    } else {
      console.log("Email has sent");
    }
  });
};

export function isValidEmail(email: string) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}
