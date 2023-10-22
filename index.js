import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
 
const PORT = process.env.PORT || 3500

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

    //Upon connection - to all others
    socket.broadcast.emit('message', `User ${socket.id.substring(0,5)} connected`)
    
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
    socket.on('message', async (data) => {
        console.log(data)
        const message = new Message({
          user: socket.id.substring(0, 5),
          message: data,
        })
      
        try {
          await message.save();
          io.emit('message', `${socket.id.substring(0, 5)} : ${data}`);//emit to socket.on(message for everyone)
        } catch (error) {
          console.error('Error saving message to MongoDB:', error)
        }
    })

    //When user disconnects - to all others
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`)
        socket.broadcast.emit('message', `User ${socket.id.substring(0,5)} disconnected`)
    })

    //Listen for activity
    socket.on('activity', (name) =>{
        socket.broadcast.emit('activity',name)
    })
})