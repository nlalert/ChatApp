import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const ADMIN = "Admin";

const app = express();

mongoose.connect(
  "mongodb+srv://chatuser:GEBBxGJwp67HADQG@cluster0.mx9kas7.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const messageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: String,
});

const Message = mongoose.model("Message", messageSchema);

app.use(express.static(path.join(__dirname, "public")));

const expressServer = app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

const io = new Server(expressServer, {
  cors: {
    origin: "*",
  },
});

let typing = []
let online = []

io.on("connection", async (socket) => {
  let userName;
  socket.on("join", async (name) => {
    userName = name;
    console.log(userName + " connected");
    online.push(userName)
    try {
      const messages = await Message.find().sort({ timestamp: 1 }).exec();

      messages.forEach((message) => {
        socket.emit("message", {
          name: `${message.user}`,
          text: `${message.message}`,
          time: `${message.timestamp}`,
        });
      });
    } catch (error) {
      console.error("Error retrieving message history from MongoDB:", error);
    }

    socket.emit("message", buildMsg(ADMIN, `Welcome to ChatApp ${userName}`));
    socket.emit("setOnline", online);
    socket.broadcast.emit("setOnline", online);

    socket.broadcast.emit(
      "message",
      buildMsg(ADMIN, ` ${userName} has joined the ChatApp`)
    );
  });

  socket.on("message", async (text) => {
    console.log(userName + " : " + text);
    const message = new Message({
      user: userName,
      message: text,
      timestamp: new Intl.DateTimeFormat(
        "default",
        {
          hour: "numeric",
          minute: "numeric",
        },
        "hour12"
      ).format(new Date()),
    });

    try {
      await message.save();
      io.emit("message", buildMsg(userName, text));
    } catch (error) {
      console.error("Error saving message to MongoDB:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(userName + " disconnected");

    if (userName) {
      online.splice(online.indexOf(userName), 1);
      socket.emit("setOffline", online);
      socket.broadcast.emit("setOffline", online);
      socket.broadcast.emit(
        "message",
        buildMsg(ADMIN, ` ${userName} has left the ChatApp`)
      );
    }
  });

  socket.on("activity", () => {
    if (!typing.includes(userName)) {
      typing.push(userName);
    }
    console.log(typing);
    socket.broadcast.emit("activity", userName, typing);
  });

  socket.on("deleteTyping", (name) => {
    typing.splice(typing.indexOf(name), 1);
  });
});

function buildMsg(name, text) {
  return {
    name,
    text,
    time: new Intl.DateTimeFormat(
      "default",
      {
        hour: "numeric",
        minute: "numeric",
      },
      "hour12"
    ).format(new Date()),
  };
}
