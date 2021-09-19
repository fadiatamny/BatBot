import * as dotenv from 'dotenv'
import path from 'path'
import BotController from './controllers/Bot.controller'

dotenv.config({ path: path.join(__dirname, `../${process.env.NODE_ENV ?? 'development'}.env`) })
// check dependecy here!
BotController.specificInstance(process.env.PREFIX)
