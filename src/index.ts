import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, `../${process.env.NODE_ENV}.env`) })

import BotHandler from './controllers/Bot.controller'

BotHandler.specificInstance(process.env.PREFIX)
