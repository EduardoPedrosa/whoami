import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { allowedOrigins } from './game/game.gateway'

async function bootstrap() {
  const port = Number(process.env.PORT || 3005)
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('PORT precisa ser uma porta válida.')
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN)
    throw new Error('Configure CORS_ORIGIN em produção.')
  const app = await NestFactory.create(AppModule)
  app.use(helmet())
  app.enableCors({ origin: allowedOrigins() })
  app.enableShutdownHooks()
  await app.listen(port, '0.0.0.0')
  console.log(`WHOAMI_READY ${await app.getUrl()}`)
}
bootstrap().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
