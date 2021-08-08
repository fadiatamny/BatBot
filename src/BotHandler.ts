import Watcher from './Watcher'
import { Client, Message } from 'discord.js'

enum BotCommands {
    REFRESH = 'refresh',
    IP = 'ip',
    SET_IP = 'set ip'
}

enum BotEvents {
    READY = 'ready',
    MESSAGE = 'message'
}

const enumKeys = <E>(e: E): (keyof E)[] => {
    return Object.keys(e) as (keyof E)[];
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
            this.instance._removeListeners()
            this.instance._bot.destroy()
            this.instance._ip = ''
            this._instance = null
        }

        this._instance = new BotHandler(prefix)
    }

    private _bot: Client
    private _ip: string
    private _handlers: {[key: string]: (...args: any[]) => void}
    private _commands: {[key: string]: (...args: any[]) => void}

    constructor(private _prefix:string = '!') {
        this._ip = ''
        this._bot = new Client()
        this._handlers = {
            [BotEvents.READY]: this._ready.bind(this),
            [BotEvents.MESSAGE]: this._message.bind(this),
        }

        this._commands = {
            [BotCommands.IP]: this._ipCommand.bind(this),
            [BotCommands.REFRESH]: this._refreshCommand.bind(this),
            [BotCommands.SET_IP]: this._setIPCommand.bind(this)
        }

        this._addListeners()
        this._connect()
    }

    private _addListeners() {
        Object.entries(this._handlers).forEach(([key, value]) => this._bot.on(key, value))
    }

    private _removeListeners() {
        Object.entries(this._handlers).forEach(([key, value]) => this._bot.off(key, value))
    }

    private _ready() {
        console.log('The bot is connected !')
        Watcher.instance.start()
    }

    private _refreshCommand(message: Message) {
        Watcher.instance.refresh()
        message.reply(`I've refreshed the watcher!`)
    }

    private _ipCommand(message: Message) {
        if (this.ip === '') {
            message.reply('The ip is not set yet.')
        } else {
            message.reply(`The ip is: ${this.ip}`)
        }
    }

    private _setIPCommand(message: Message) {
        if (this.ip === '') {
            message.reply('The ip is not set yet.')
        } else {
            this.setPresenceMessage(this.ip)
            message.reply(`IP set to: ${this.ip}`)
        }
    }

    private _message(message: Message) {
        let content = message.content.toLowerCase()
        if (!content.startsWith(this._prefix)) {
            return
        } else {
            content = content.slice(1)
        }

        for(const command of enumKeys(BotCommands)) {
            const key = BotCommands[command]
            if(content.startsWith(`${this._prefix}${key}`)) {
                this._commands[key](message)
            }
        }
    }

    private _connect() {
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
