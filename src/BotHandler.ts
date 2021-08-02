import Watcher from './Watcher'
import { Client, Message } from 'discord.js'

enum BotCommands {
    REFRESH = 'refresh',
    IP = 'ip'
}

export default class BotHandler {
    private static _instance: BotHandler | null
    public static get instance() {
        if (!this._instance) {
            this._instance = new BotHandler()
        }

        return this._instance
    }

    public static specificInstance(prefix?: string) {
        if (this.instance) {
            this.instance.removeListeners()
            this.instance._bot.destroy()
            this.instance._ip = ''
            this._instance = null
        }

        this._instance = new BotHandler(prefix)
    }

    private _bot: Client
    private _ip: string
    constructor(private _prefix:string = '!') {
        this._ip = ''
        this._bot = new Client()
        this.addListeners()
        this.connect()
    }

    private addListeners() {
        this._bot.on('ready', this.ready.bind(this))
        this._bot.on('message', this.message.bind(this))
    }

    private removeListeners() {
        this._bot.off('ready', this.ready.bind(this))
        this._bot.off('message', this.message.bind(this))
    }

    private ready() {
        console.log('The bot is connected !')
        Watcher.instance.start()
    }

    private message(message: Message) {
        let content = message.content.toLowerCase()
        if (!content.startsWith(this._prefix)) {
            return
        } else {
            content = content.slice(1)
        }

        switch (content) {
            case BotCommands.REFRESH:
                Watcher.instance.refresh()
                message.reply(`I've refreshed the watcher!`)
                break
            case BotCommands.IP:
                if (this.ip === '') {
                    message.reply('The ip is not set yet.')
                } else {
                    message.reply(`The ip is: ${this.ip}`)
                }
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
