const sendToAllAndHideOwnLabel = (io, allUsers) => {
  io.sockets.sockets.forEach((s) => {
    const users = JSON.parse(JSON.stringify(allUsers))
    const userIndex = users.findIndex((u) => u.id === s.id)
    if (userIndex !== -1) {
      const userSelf = users[userIndex]
      userSelf.label = userSelf.label ? "hidden" : ""
      s.emit("users", users)
    }
  })
}

module.exports = sendToAllAndHideOwnLabel
