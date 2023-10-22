import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
 
const PORT = process.env.PORT || 8080
const ADMIN = "Admin"
const room = "room"

const app = express()

mongoose.connect('mongodb+srv://chatuser:GEBBxGJwp67HADQG@cluster0.mx9kas7.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const messageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`)
})

//web socket server
const io = new Server(expressServer, {
    cors : {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500","http://127.0.0.1:5500"]
    }
})

//connection
io.on('connection', async (socket) => {
    console.log(`User ${socket.id} connected`)
    
    //Upon connection - only to user
    socket.emit('message', "Welcome to Chat App!")

    socket.on('enterRoom', ({ name }) => {
      const user = activateUser(socket.id, name, room)
      socket.join(room)
      
      //Upon joining room - only to user
      socket.emit('message', buildMsg(ADMIN, `You have joined the Chat App`))
      
      //Upon joining room - To everyone else 
      socket.broadcast.to(room).emit('message', buildMsg(ADMIN, `${user.name} has joined the Chat App`))
      
      // Update user list for room
      io.to(room).emit('userList', {
        users: getUsersInRoom(room)
      })

    })

    try {
        // Retrieve message history from MongoDB
        const messages = await Message.find().sort({ timestamp: 1 }).exec();
    
        // Send message history to the connecting user
        messages.forEach((message) => {
          socket.emit('message', `${message.user} : ${message.message}`);
        });
      } catch (error) {
        console.error('Error retrieving message history from MongoDB:', error);
    }

    //Listening for a message event
    socket.on('message', async ({ name, text }) => {
        console.log(text)
        const message = new Message({
          user: name,
          message: text,
        })
      
        try {
          await message.save();
          io.to(room).emit('message', buildMsg(name, text));//emit to socket.on(message for everyone)
        } catch (error) {
          console.error('Error saving message to MongoDB:', error)
        }
    })

    //When user disconnects - to all others
    socket.on('disconnect', () => {
      const user = getUser(socket.id)
      userLeavesApp(socket.id)

      if (user) {
          io.to(room).emit('message', buildMsg(ADMIN, `${user.name} has left the Chat App`))

          io.to(room).emit('userList', {
              users: getUsersInRoom(room)
          })

          io.emit('roomList', {
              rooms: getAllActiveRooms()
          })
      }

      console.log(`User ${socket.id} disconnected`)

    })

    //Listen for activity
    socket.on('activity', (name) =>{
        socket.broadcast.emit('activity',name)
    })
})

function activateUser(id, name) {
  const user = { id, name }
  UsersState.setUsers([
      ...UsersState.users.filter(user => user.id !== id),
      user
  ])
  return user
}

function buildMsg(name, text) {
  return {
      name,
      text,
      time: new Intl.DateTimeFormat('default', {
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
      }).format(new Date())
  }
}