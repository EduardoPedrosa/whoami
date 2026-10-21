const server = require("http").createServer()
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
})

const getNextUserIndex = require("./utils/getNextUserIndex")
const sendToAllAndHideOwnLabel = require("./utils/sendToAllAndHideOwnLabel")
const states = require("./utils/states")

const users = []
let state = states.WAITING

io.on("connection", (client) => {
  client.emit("me", client.id)

  client.on("enter", (data) => {
    if (state === states.WAITING) {
      users.push({ id: client.id, name: data, label: "" })
      sendToAllAndHideOwnLabel(io, users)
    } else {
      client.emit("error", "Game already started")
    }
  })

  client.on("disconnect", () => {
    const index = users.findIndex((u) => u.id === client.id)
    if (index === -1) return
    users.splice(index, 1)
    if (users.length === 0) state = states.WAITING
    sendToAllAndHideOwnLabel(io, users)
  })

  client.on("setLabel", (label) => {
    if (state === states.WAITING) {
      const nextUserIndex = getNextUserIndex(client.id, users)
      const nextUser = users[nextUserIndex]
      if (nextUser) {
        nextUser.label = label
        sendToAllAndHideOwnLabel(io, users)
      }
    } else {
      client.emit("error", "Game already started")
    }
  })

  client.on("start", () => {
    if (users.length > 1) {
      const index = users.findIndex((u) => !u.label)
      if (index === -1) {
        state = states.STARTED
        io.emit("started")
      } else {
        client.emit("error", "Waiting for the label creation")
      }
    } else {
      client.emit("error", "Cannot start with only one person")
    }
  })

  client.on("restart", () => {
    state = states.WAITING
    users.forEach((u) => (u.label = ""))
    sendToAllAndHideOwnLabel(io, users)
    io.emit("restarted")
  })
})

const port = process.env.PORT || 3005
server.listen(port, () => {
  console.log(`RUNNING ON PORT ${server.address().port}`)
})
