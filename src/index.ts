import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, `../${process.env.NODE_ENV}.env`) })

import BotController from './controllers/Bot.controller'

BotController.specificInstance(process.env.PREFIX)
