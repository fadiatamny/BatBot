import { Client, Message, Intents } from 'discord.js'
import { UserConfig } from '../services/UserConfig.service'
import RatingController from './Rating.controller'
import WatcherController from './Watcher.controller'
import MusicController from './Music.controller'
import { throws } from 'assert'
import { Logger } from '../utils/Logger'

enum BotServices {
    WATCHER = 'watcher',
    RATING = 'rating',
    MUSIC = 'queue'
}

enum BotEvents {
    READY = 'ready',
    MESSAGE = 'message'
}

export default class BotController {
    private static _instance: BotController | null
    public static get instance() {
        if (!this._instance) {
            this._instance = new BotController()
        }

        return this._instance
    }

    public static specificInstance(prefix?: string) {
        if (this._instance) {
            this.instance._removeListeners()
            this.instance._bot.destroy()
            this._instance = null
        }

        this._instance = new BotController(prefix)
    }

    private _bot: Client
    private _handlers: { [key: string]: (...args: any[]) => void }
    private _logger: Logger

    public config: UserConfig
    public music: MusicController
    public watcher: WatcherController | undefined
    public rating: RatingController | undefined

    constructor(private _prefix: string = '!') {
        this._bot = new Client({
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
        })
        this._logger = new Logger('BotController')
        this._handlers = {
            [BotEvents.READY]: this._ready.bind(this),
            [BotEvents.MESSAGE]: this._message.bind(this)
        }

        this.config = new UserConfig()
        this.music = new MusicController(this._bot)

        if (this.config.ipwatcher) {
            this.watcher = new WatcherController(this._bot)
        }
        if (this.config.rating) {
            this.rating = new RatingController(this._bot)
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
        this.watcher?.start()
    }

    private _cleanContentPrefix(content: string) {
        const split = content.split(' ')
        split.shift()
        return split.join(' ')
    }

    private _handleCommands(message: Message) {
        const content = message.content.substring(1)
        const service = content.split(' ')[0].toLocaleLowerCase()
        const cleaned = this._cleanContentPrefix(content)

        switch (service) {
            case BotServices.WATCHER:
                this.watcher?.handleCommands(cleaned, message)
                break
            case BotServices.RATING:
                this.rating?.handleCommands(cleaned, message)
                break
            case BotServices.MUSIC:
                this.music.handleCommands(cleaned, message)
                break
            default:
                // return message of service not available.
                break
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
