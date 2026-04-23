import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MainPage from './MainPage.jsx'
import JoinRoomPage from './JoinRoomPage.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
const router = createBrowserRouter([
  {
    path: "/",
    element: <JoinRoomPage />,
  },
  {
    path: "/join",
    element: <JoinRoomPage/>
  },
  {
    path: "/editor",
    element: <MainPage />,
  }
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
