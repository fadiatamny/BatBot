import { Message } from 'discord.js'
import Watcher from './Watcher'
import Discord from 'discord.js'

enum BotCommands {
    REFRESH = 'refresh'
}

export default class BotHandler {
    private static _instance: BotHandler
    public static get instance() {
        if (!this._instance) {
            this._instance = new BotHandler()
        }

        return this._instance
    }

    private _bot: Discord.Client
    private _ip: string
    constructor() {
        this._ip = ''
        this._bot = new Discord.Client()
        this._bot.on('ready', this.ready.bind(this))
        this._bot.on('message', this.message.bind(this))
        this.connect()
    }

    private ready() {
        console.log('The bot is connected !')
        Watcher.instance.start()
    }

    private message(message: Message) {
        console.log('here')
        const content = message.content.toLowerCase()
        switch (content) {
            case BotCommands.REFRESH:
                Watcher.instance.refresh()
                break
        }
    }

    private connect() {
        this._bot.login(process.env.BOT_TOKEN)
    }

    public get ip() {
        return this._ip
    }

    public setPresenceMessage(ip: string) {
        this._bot.user?.setPresence({
            status: 'online',
            activity: {
                name: ip,
                type: 'WATCHING'
            }
        })

        this._ip = ip
    }
}
