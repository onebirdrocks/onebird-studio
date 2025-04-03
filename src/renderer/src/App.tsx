import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import Chat from './Chat'


function App(): JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <Chat />
  )
}

export default App
