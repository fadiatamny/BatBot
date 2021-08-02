import Watcher from './Watcher'
import { Client, Message } from 'discord.js'

enum BotCommands {
    REFRESH = 'refresh',
    IP = 'ip'
}

enum BotEvents {
    READY = 'ready',
    MESSAGE = 'message'
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
    private _handlers: {[key: string]: (...args: any[]) => void}

    constructor(private _prefix:string = '!') {
        this._ip = ''
        this._bot = new Client()
        this._handlers = {
            [BotEvents.READY]: this.ready.bind(this),
            [BotEvents.MESSAGE]: this.message.bind(this),
        }

        this.addListeners()
        this.connect()
    }

    private addListeners() {
        Object.entries(this._handlers).forEach(([key, value]) => this._bot.on(key, value))
    }

    private removeListeners() {
        Object.entries(this._handlers).forEach(([key, value]) => this._bot.off(key, value))
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
