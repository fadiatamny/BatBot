import * as dotenv from 'dotenv'
dotenv.config()

import BotHandler from './BotHandler'

BotHandler.specificInstance(process.env.PREFIX)
