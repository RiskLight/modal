beforeEach(() => {
  const style = document.createElement('style')
  style.id = 'test-no-motion'
  style.textContent = '.modal-list-enter-active, .modal-list-leave-active { transition: none; animation: none; }'
  document.head.append(style)
})
