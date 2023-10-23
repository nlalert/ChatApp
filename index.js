import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
 
const PORT = process.env.PORT || 8080

const app = express()

//connect to MongoDB
mongoose.connect('mongodb+srv://chatuser:GEBBxGJwp67HADQG@cluster0.mx9kas7.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//Create schema for message
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
    origin: "*"
  }
})

let typing = []

//when client connect with server
io.on('connection', async (socket) => {
  let userName
    console.log(`User ${socket.id} connected`)
    
    socket.on('join', async (name) => {
      userName = name
      console.log(userName + " connected")
      //only to user
      socket.emit('welcomeMessage')

      //to all others except user
      socket.broadcast.emit('message', buildMsg(name, "connected"))
      try {
        // Retrieve message history from MongoDB
        const messages = await Message.find().sort({ timestamp: 1 }).exec();
    
        // Send message history to the connecting user
        messages.forEach((message) => {
          socket.emit('message', {
            name :`${message.user}`,
            text : `${message.message}`,
            time : `${message.timestamp}`});
        });
      } catch (error) {
        console.error('Error retrieving message history from MongoDB:', error);
      }
    })

    //Listening for a message event
    socket.on('message', async (text) => {
        console.log(userName + text)
        const message = new Message({
          user: userName,
          message: text,
          timestamp: Date.now()
        })
      
        try {
          await message.save();
          io.emit('message', buildMsg(userName, text))
        } catch (error) {
          console.error('Error saving message to MongoDB:', error)
        }
    })

    //When user disconnects - to all others
    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected`)
      socket.broadcast.emit('message', buildMsg(userName, "disconnected"))
    })

    //Listen for activity
    socket.on('activity', () =>{
      if(!typing.includes(userName)){
        typing.push(userName)
      }
      console.log(typing)
      socket.broadcast.emit('activity', userName, typing)
    })

    socket.on('deleteTyping', () =>{
      typing.splice(typing.indexOf(userName), 1)
    })
})

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