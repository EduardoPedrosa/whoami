import { Controller, Get, Module } from '@nestjs/common'
import { GameGateway } from './game/game.gateway'
import { GameService } from './game/game.service'
import { DatabaseService } from './storage/database.service'

@Controller('api')
class HealthController {
  @Get('health') health() {
    return { status: 'ok', service: 'whoami', version: '2.0.0' }
  }
}

@Module({
  controllers: [HealthController],
  providers: [DatabaseService, GameService, GameGateway],
})
export class AppModule {}
