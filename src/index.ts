import * as dotenv from 'dotenv'
import path from 'path'
import BotController from './controllers/Bot.controller'

const envName = process.env.NODE_ENV ?? 'development'
dotenv.config({ path: path.join(__dirname, `../${envName}.env`) })

try {
    BotController.initInstance()
} catch (e) {
    console.log(e)
}