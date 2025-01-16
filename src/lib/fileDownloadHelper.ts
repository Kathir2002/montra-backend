import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

interface SecureFileHandlerConfig {
  expiryTime?: number;
}

class SecureFileHandler {
  private expiryTime: number;

  constructor(config: SecureFileHandlerConfig = {}) {
    this.expiryTime = config.expiryTime || 24 * 60 * 60 * 1000; // 24 hours
  }

  // Getter to expose expiryTime
  getExpiryTime(): number {
    return this.expiryTime;
  }

  generateToken(fileName: string, timestamp?: number) {
    const match = fileName.match(/\d+/); // Matches the first sequence of digits
    const fileExpiry = match ? match[0] : null;
    const orgTimeStamp = fileExpiry ? parseInt(fileExpiry) : timestamp;
    const data = `${fileName}-${orgTimeStamp}`;
    const token = crypto
      .createHmac("sha256", process.env.SECRET_KEY!)
      .update(data)
      .digest("hex");
    return {
      token,
      timestamp: orgTimeStamp,
      expires: orgTimeStamp! + this.expiryTime,
    };
  }

  verifyToken(fileName: string, token: string, timestamp: number): boolean {
    const expectedToken = this.generateToken(fileName, timestamp).token;
    return token === expectedToken;
  }

  async saveTemporaryFile(
    fileContent: string | Buffer,
    originalFileName: string
  ): Promise<string> {
    // Ensure upload directory exists
    await fs.mkdir("temp/downloads", { recursive: true });

    const filePath = path.join("temp/downloads", originalFileName);
    await fs.writeFile(filePath, fileContent);
    return originalFileName;
  }
}

export { SecureFileHandler };
