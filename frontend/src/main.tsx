import { createRoot } from 'react-dom/client'
import { IconContext } from '@phosphor-icons/react'
import { App } from './app'
import './styles.css'
createRoot(document.getElementById('root')!).render(
  <IconContext.Provider value={{ weight: 'regular' }}>
    <App />
  </IconContext.Provider>,
)
