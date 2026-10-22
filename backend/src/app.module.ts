import { Controller, Get, Module } from '@nestjs/common'
import { GameGateway } from './game/game.gateway'
import { GameService } from './game/game.service'
import { GameStore } from './storage/game-store'
import { MemoryStore } from './storage/memory-store'

@Controller('api')
class HealthController {
  @Get('health') health() {
    return { status: 'ok', service: 'whoami', version: '2.0.0' }
  }
}

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: GameStore,
      useFactory: async () => {
        const mode = process.env.STORAGE_MODE || 'sqlite'
        if (mode === 'memory') return new MemoryStore()
        if (mode === 'sqlite') {
          const { DatabaseService } = await import('./storage/database.service')
          return new DatabaseService()
        }
        throw new Error('STORAGE_MODE precisa ser memory ou sqlite.')
      },
    },
    GameService,
    GameGateway,
  ],
})
export class AppModule {}
