const socket = new io('https://chat-app-bp41.onrender.com/')

const nameInput = document.querySelector('#name')
const msgInput = document.querySelector('#message')
const activity = document.querySelector('.activity')
const chatDisplay = document.querySelector('.chat-display')
const formMsg = document.querySelector('.form-msg')
formMsg.style.visibility = "hidden";
chatDisplay.style.visibility = "hidden";

function sendMessage(e) {
    e.preventDefault()
    if (msgInput.value) {
        socket.emit('message', (msgInput.value))
        msgInput.value = ""
    }
    msgInput.focus()
}

function join(e) {
    e.preventDefault()
    if (nameInput.value) {
        socket.emit('join', (nameInput.value))
        document.querySelector('.form-join').style.visibility = "hidden";
        chatDisplay.style.visibility = "visible";
        formMsg.style.visibility = "visible";
    }
}

document.querySelector('.form-join')
    .addEventListener('submit', join)

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage)

msgInput.addEventListener('keypress', () => {
    socket.emit('activity')
})

socket.on("welcomeMessage", () => {
    activity.textContent = ""
    const li = document.createElement('li')
    
    li.innerHTML = `<div class="post__text">"Welcome to Chat App!"</div>`
    document.querySelector('.chat-display').appendChild(li)

    chatDisplay.scrollTop = chatDisplay.scrollHeight
})

// Listen for messages 
socket.on("message", (data) => {
    activity.textContent = ""
    const { name, text, time } = data
    const li = document.createElement('li')
    li.className = 'post'
    if (name === nameInput.value) li.className = 'post post--left'
    if (name !== nameInput.value && name !== 'Admin') li.className = 'post post--right'
    if (name !== 'Admin') {
        li.innerHTML = `<div class="post__header ${name === nameInput.value
            ? 'post__header--user'
            : 'post__header--reply'
            }">
        <span class="post__header--name">${name}</span> 
        <span class="post__header--time">${time}</span> 
        </div>
        <div class="post__text">${text}</div>`
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`
    }
    document.querySelector('.chat-display').appendChild(li)

    chatDisplay.scrollTop = chatDisplay.scrollHeight
})

let activityTimer
socket.on('activity', (name, typingUser) =>{
    
    activity.textContent = `${typingUser} is typing...`
    //Clear after 1 seconds
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        socket.emit('deleteTyping', name)
        activity.textContent = ""
    }, 3000)
})
