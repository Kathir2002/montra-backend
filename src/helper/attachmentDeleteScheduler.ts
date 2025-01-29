import cron from "node-cron";
import path from "path";
import fs from "fs/promises";
import { SecureFileHandler } from "../lib/fileDownloadHelper";

const attachmentDeleteScheduler = (cronExpression: string) => {
  cron.schedule(
    cronExpression,
    async () => {
      const folderPath = path.join(__dirname, "..", "..", "temp/downloads");

      const normalizedPath = path.normalize(folderPath);

      // Read the directory contents
      const files = await fs.readdir(normalizedPath, { withFileTypes: true });
      const fileHandler = new SecureFileHandler();

      files.map(async (file) => {
        const filePath = path.join(normalizedPath, file.name);
        await fs.access(filePath);
        const timestampNum = parseInt(file?.name?.match(/\d+/)![0]);

        if (
          file.isFile() &&
          Date.now() > timestampNum + fileHandler.getExpiryTime()
        ) {
          console.log("File Expired", file.name);
          fs.unlink(filePath).catch(console.error);
        }
      });
    },
    { timezone: "Asia/Kolkata", recoverMissedExecutions: false }
  );
};

const cronExpression = "0 18 * * *";
attachmentDeleteScheduler(cronExpression);
