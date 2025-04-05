import { createBrowserRouter } from 'react-router-dom'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Agent from './pages/Agent'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Chat />,
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