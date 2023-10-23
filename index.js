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
    console.log(`User ${socket.id} connected`)
    
    //only to user
    socket.emit('welcomeMessage')

    //to all others except user
    socket.broadcast.emit('message', buildMsg(socket.id.substring(0,5), "connected"))
    
    try {
        // Retrieve message history from MongoDB
        const messages = await Message.find().sort({ timestamp: 1 }).exec();
    
        // Send message history to the connecting user
        messages.forEach((message) => {
          socket.emit('message', buildMsg(`${message.user}`, `${message.message}`));
        });
      } catch (error) {
        console.error('Error retrieving message history from MongoDB:', error);
    }

    //Listening for a message event
    socket.on('message', async ({name, text}) => {
        console.log(name + text)
        const message = new Message({
          user: name,
          message: text,
        })
      
        try {
          await message.save();
          io.emit('message', buildMsg(name, text))
        } catch (error) {
          console.error('Error saving message to MongoDB:', error)
        }
    })

    //When user disconnects - to all others
    socket.on('disconnect', () => {
      console.log(`User ${socket.id} disconnected`)
      socket.broadcast.emit('message', buildMsg(socket.id.substring(0,5), "disconnected"))
    })

    //Listen for activity
    socket.on('activity', (name) =>{
      if(!typing.includes(name)){
        typing.push(name)
      }
      console.log(typing)
      socket.broadcast.emit('activity', name, typing)
    })

    socket.on('deleteTyping', (name) =>{
      typing.splice(typing.indexOf(name), 1)
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