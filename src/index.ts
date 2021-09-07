import * as dotenv from 'dotenv'
dotenv.config()

import BotHandler from './controllers/Bot.controller'

BotHandler.specificInstance(process.env.PREFIX)
