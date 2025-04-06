import { createBrowserRouter } from 'react-router-dom'
import { ChatStream } from './components/ChatStream'
import Settings from './pages/Settings'
import Agent from './pages/Agent'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ChatStream />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/agent',
    element: <Agent />,
  },
]) 