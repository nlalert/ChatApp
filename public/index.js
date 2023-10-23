const socket = new io('ws://localhost:8080')

const nameInput = document.querySelector('#name')

function join(e) {
    e.preventDefault()
    if (nameInput.value) {
        socket.emit('join', (nameInput.value))
        window.location.href = "chat.html"; 
    }
}

document.querySelector('.form-join')
    .addEventListener('submit', join)

