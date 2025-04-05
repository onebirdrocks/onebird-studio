import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@renderer/layouts/MainLayout'
import Chat from '@renderer/Chat'
import Settings from '@renderer/pages/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />
      },
      {
        path: 'chat',
        element: <Chat />
      },
      {
        path: 'settings',
        element: <Settings />
      }
    ]
  }
]) 