const path = require('path')
const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const formatMessage = require('./utils/messages')
const {
	getCurrentUser,
	userJoin,
	userLeave,
	getRoomUsers,
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)
const PORT = process.env.PORT || 3000

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))

const botName = 'ChatBot'

// Run when client connects
io.on('connection', (socket) => {
	socket.on('joinRoom', ({ username, room }) => {
		const user = userJoin(socket.id, username, room)

		socket.join(user.room)

		// Welcome current user
		socket.emit('message', formatMessage(botName, 'Welcome to Chat!'))

		// Broadcast when user connects
		socket.broadcast
			.to(user.room)
			.emit(
				'message',
				formatMessage(
					botName,
					`A ${user.username} has joined the chat.`
				)
			)

		// Send users and room info
		io.to(user.room).emit('roomUsers', {
			room: user.room,
			users: getRoomUsers(user.room),
		})
	})

	// Lister for chatMessage
	socket.on('chatMessage', (msg) => {
		const user = getCurrentUser(socket.id)
		io.to(user.room).emit('message', formatMessage(user.username, msg))
	})

	// Runs when clients disconects
	socket.on('disconnect', () => {
		const user = userLeave(socket.id)
		if (user) {
			io.to(user.room).emit(
				'message',
				formatMessage(botName, `A ${user.username} has left the chat`)
			)

			// Send users and room info
			io.to(user.room).emit('roomUsers', () => {
				return {
					room: user.room,
					users: getRoomUsers(user.room),
				}
			})
		}
	})
})

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
