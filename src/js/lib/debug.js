function log(message) {
  if (localStorage.getItem('_DEBUG') == 1) {
    console.log(message);
  }
}

module.exports = {
  log,
}
