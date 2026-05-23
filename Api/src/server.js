import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import routes from "./routes.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();
const server = createServer(app);

const allowedOrigins = ["http://localhost:5173","https://compilebox.me","https://www.compilebox.me"];

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}
));

app.use("", routes);

app.use((err, req, res, next) => {
  let customError = err;

  // If it's not an ApiError, convert it
  if (!(err instanceof ApiError)) {
    customError = new ApiError(
      err.statusCode || 500,
      err.message || "Internal Server Error",
    );
  }

  res.status(customError.statusCode).json({
    success: customError.success,
    message: customError.message,
    errors: customError.errors,
  });
});

const userSocketMap = {};

const getAllConnectedClients = (roomId) => {
  let clients = [];
  const room = io.sockets.adapter.rooms.get(roomId);
  if(!room) {   
    return [];
  }
  if (room) {
    clients = Array.from(room).map((socketId) => {
      return {
        socketId: socketId,
        username: userSocketMap[socketId]?.userName,
      };
    });
  }
  return clients;
};

io.on("connection", (socket) => {
    socket.on("disconnecting", () => {
        const userData = userSocketMap[socket.id];
        if(userData){
            socket.to(userData.roomId).emit("user-left", { userName: userData.userName });  
            delete userSocketMap[socket.id];
            const remainingClients = getAllConnectedClients(userData.roomId).filter(client => client.socketId !== socket.id);
            io.to(userData.roomId).emit("room-users", {clients: remainingClients});
            console.log(`User ${userData.userName} left room: ${userData.roomId}`);
            console.log(`Current clients in room ${userData.roomId}:`, remainingClients);
        }
    });

    socket.on("request-sync",({roomId}) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        if(room){
            const existingClientId = Array.from(room).find(id => id !== socket.id);
            if(existingClientId){
                io.to(existingClientId).emit("sync-required", { socketId: socket.id });
            }
        }
    })

    socket.on("sync-response",({socketId,update}) => {
        io.to(socketId).emit("sync-response", { update });
    })




  socket.on("join-room", ({ roomId, userName }) => {
    console.log(`User ${userName} joined room: ${roomId}`);
    userSocketMap[socket.id] = {roomId,userName};
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    socket.to(roomId).emit("user-joined", { userName });
    io.to(roomId).emit("room-users", {clients});
    console.log(`Current clients in room ${roomId}:`, clients);
  });

  socket.on("yjs-update", ({ roomId, update }) => {
    socket.to(roomId).emit("yjs-update", { update: update });
  });
});

server.listen(3000, () => {
  console.log("API & WebSocket Server running");
});
