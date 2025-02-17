import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
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

      socket.on("disconnect", async () => {
        // Broadcast user offline status
        io.emit("user:offline", userId);
      });
    }
  });

  return io;
};
