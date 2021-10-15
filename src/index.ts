import * as dotenv from 'dotenv'
import path from 'path'
import BotController from './controllers/Bot.controller'
import { Logger } from './utils/Logger'

const envName = process.env.NODE_ENV ?? 'development'
dotenv.config({ path: path.join(__dirname, `../${envName}.env`) })

try {
    BotController.initInstance()
} catch (e) {
    console.log(e)
}

const logger = new Logger('PROCESS')
process.on('unhandledRejection', (reason, p) => {
    logger.warn('Unhandled Rejection')
    logger.error('Unhandled Rejection at: Promise ', p, ' reason: ', reason)
})
