import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { X, WarningCircle } from '@phosphor-icons/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { HelpDialog } from '@/components/help-dialog'
import { ConnectionBanner, ConnectionStatus } from '@/components/connection-status'
import { Home } from '@/features/game/home'
import { gameClient, useGame } from '@/lib/game-client'
const RoomScreen = lazy(() =>
  import('@/features/room/room-screen').then((module) => ({ default: module.RoomScreen })),
)

export function App() {
  const { room, error } = useGame()
  useEffect(() => {
    gameClient.start()
    return () => gameClient.stop()
  }, [])
  const roomCode = room?.code
  useEffect(() => {
    document.title = roomCode ? `${roomCode} · Quem sou eu?` : 'Quem sou eu?'
  }, [roomCode])
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={250}>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        <div className="app-shell">
          <header className="site-header">
            <Brand inRoom={!!room} />
            <nav aria-label="Navegação principal">
              <HelpDialog />
              <ConnectionStatus />
            </nav>
          </header>
          <ConnectionBanner />
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="error-banner"
                role="alert"
              >
                <WarningCircle aria-hidden="true" size={22} />
                <p>{error}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Fechar mensagem"
                  onClick={gameClient.clearError}
                >
                  <X size={18} aria-hidden="true" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Suspense
            fallback={
              <main id="main-content" className="room-loading" role="status">
                <div className="loading-card" />
                <p>Carregando a sala…</p>
              </main>
            }
          >
            {room ? <RoomScreen room={room} /> : <Home />}
          </Suspense>
          <footer className="site-footer">
            <span>Jogue com seus amigos.</span>
            <span className="footer-question">Sem cadastro.</span>
          </footer>
        </div>
      </TooltipProvider>
    </MotionConfig>
  )
}

function Brand({ inRoom }: { inRoom: boolean }) {
  const content = (
    <>
      <span className="brand-symbol" aria-hidden="true">
        ?
      </span>
      <span>
        whoami<span className="brand-period">.</span>
      </span>
    </>
  )
  return inRoom ? (
    <div className="brand" role="img" aria-label="Whoami">
      {content}
    </div>
  ) : (
    <a className="brand" href="/" aria-label="Whoami, início">
      {content}
    </a>
  )
}
