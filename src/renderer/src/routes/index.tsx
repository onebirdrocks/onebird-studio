import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '@renderer/layouts/MainLayout'
import { ChatStream } from '@renderer/components/ChatStream'
import Settings from '@renderer/pages/Settings'
import Help from '@renderer/pages/Help'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <ChatStream />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: 'help',
        element: <Help />
      }
    ]
  }
]) 