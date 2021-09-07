import Watcher from '../services/Watcher.service'
import { Client, Message } from 'discord.js'
import WatcherHandler from './Watcher.controller'

enum BotServices {
    WATCHER = 'watcher',
    RATING = 'rating'
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
            this.instance._removeListeners()
            this.instance._bot.destroy()
            this._instance = null
        }

        this._instance = new BotHandler(prefix)
    }

    private _bot: Client
    private _watcher: WatcherHandler
    private _handlers: { [key: string]: (...args: any[]) => void }

    constructor(private _prefix: string = '!') {
        this._bot = new Client()
        this._handlers = {
            [BotEvents.READY]: this._ready.bind(this),
            [BotEvents.MESSAGE]: this._message.bind(this)
        }
        this._watcher = WatcherHandler.generateInstace(this._bot)

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

    private _cleanContentPrefix(content: string, opt?: { prefix?: BotServices; count?: number }) {
        content = content.slice(opt?.prefix?.length ?? opt?.count ?? 0)
        if (content[0] === ' ') {
            content = content.slice(1)
        }
        return content
    }

    private _handleCommands(message: Message) {
        let content = message.content.toLowerCase()
        content = content.slice(1)
        if (content.startsWith(BotServices.WATCHER)) {
            content = this._cleanContentPrefix(content, { prefix: BotServices.WATCHER })
            this._watcher.handleCommands(content, message)
        } else if (content.startsWith(BotServices.RATING)) {
            content = this._cleanContentPrefix(content, { prefix: BotServices.RATING })
        }
    }

    private _message(message: Message) {
        const content = message.content.toLowerCase()
        if (content.startsWith(this._prefix)) {
            this._handleCommands(message)
            return
        }
    }

    private async _connect() {
        await this._bot.login(process.env.BOT_TOKEN)
    }
}
