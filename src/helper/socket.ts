import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import ContactSupport from "../controller/contactSupportController";
import { Response } from "express";
import { AuthRequest } from "../middleware/verifyToken";
export let io: Server;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    const userId = socket.handshake.auth.userId;

    if (userId) {
      // Join user's personal room
      socket.join(userId);

      socket.on("room:join", ({ roomId }) => {
        socket.join(roomId);
      });

      socket.on("room:leave", ({ roomId }) => {
        socket.leave(roomId);
      });

      socket.on("user:typing", ({ roomId, isTyping }) => {
        socket.to(roomId).emit("user:typing", {
          userId,
          isTyping,
        });
      });

      socket.on("message:send", async (message) => {
        const req = {
          body: message,
          _id: message?.senderId,
        };

        const res = {
          status: (code: number) => ({
            json: (data: { success: boolean; message: string }) =>
              console.log(data.message),
          }),
        };

        if (message?.isFromEdit) {
          return await ContactSupport.editReply(
            req as AuthRequest,
            res as Response
          );
        }
        await ContactSupport.addReply(req as AuthRequest, res as Response);
      });

      socket.on("message:update-read-status", async (message) => {
        const req = {
          body: message,
          _id: message?.senderId,
        };

        const res = {
          status: (code: number) => ({
            json: (data: { success: boolean; message: string }) =>
              console.log(data.message),
          }),
        };
        await ContactSupport.updateMessageStatus(
          req as AuthRequest,
          res as Response
        );
      });
      socket.on("message:delete", async (message) => {
        const req = {
          body: message,
          _id: message?.senderId,
        };

        const res = {
          status: (code: number) => ({
            json: (data: { success: boolean; message: string }) =>
              console.log(data.message),
          }),
        };

        await ContactSupport.deleteMessage(req as AuthRequest, res as Response);
      });

      socket.on("disconnect", async () => {
        // Broadcast user offline status
        io.emit("user:offline", userId);
      });
    }
  });

  return io;
};
