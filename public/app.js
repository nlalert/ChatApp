const socket = new io('https://chat-app-bp41.onrender.com')

const activity = document.querySelector('.activity')
const msgInput = document.querySelector('input')

//emit message to 
function sendMessage(e) {
    e.preventDefault()
    if(msgInput.value){
        socket.emit('message', socket.id, msgInput.value)//socket.on(message)
        msgInput.value = ""
    }
    msgInput.focus()
}

document.querySelector('form').addEventListener('submit', sendMessage)

//Listen for message
socket.on('message',  (data) => {
    activity.textContent = ""
    const li = document.createElement('li')
    li.textContent = data
    document.querySelector('ul').appendChild(li)
})

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', socket.id.substring(0,5))
})

let activityTimer
socket.on('activity', (name) =>{
    activity.textContent = `${name} is typing...`
    //Clear after 1 seconds
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        activity.textContent = ""
    }, 1500)
})