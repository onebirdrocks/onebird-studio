document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton')
  if (startButton) {
    startButton.addEventListener('click', () => {
      if (window.api && typeof window.api.sendMessage === 'function') {
        window.api.sendMessage('navigate-to-main')
      }
    })
  }
}) 