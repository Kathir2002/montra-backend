import * as CryptoJS from "crypto-js";
import dorenv from "dotenv";
dorenv.config();

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
