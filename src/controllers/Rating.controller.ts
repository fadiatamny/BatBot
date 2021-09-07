import RatingService from '../services/Rating.service'
import { Client, Message } from 'discord.js'
import { enumKeys } from '../utils'

enum RatingComamnds {
    RATE = 'rate'
}

export default class RatingController {
    private _commands: { [key: string]: (...args: any[]) => void }
    private _service: RatingService

    constructor(private _bot: Client) {
        this._commands = {
            [RatingComamnds.RATE]: this._rateCommand.bind(this),
        }
        this._service = new RatingService()
    }

    private _rateCommand(message: Message) {
        message.reply(``)
    }

    public handleCommands(content: string, message: Message) {
        for (const command of enumKeys(RatingComamnds)) {
            const key = RatingComamnds[command]
            if (content.startsWith(key)) {
                this._commands[key](message)
            }
        }
    }
}
