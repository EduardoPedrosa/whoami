const getNextUserIndex = (id, users) => {
  const index = users.findIndex((u) => u.id === id)
  if (index === users.length - 1) {
    return 0
  }
  return index + 1
}

module.exports = getNextUserIndex
