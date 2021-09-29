import { Client, Message, Intents, ActivitiesOptions, Guild, PresenceData } from 'discord.js'
import { BotConfig } from '../services/BotConfig.service'
import RatingController from './Rating.controller'
import WatcherController from './Watcher.controller'
import MusicController from './Music.controller'
import { Logger } from '../utils/Logger'
import { delay, removeFirstWord } from '../utils'

enum BotServices {
    WATCHER = 'watcher',
    RATING = 'rating',
    MUSIC = 'queue',
    MUSIC_SHORT = 'q'
}

enum BotEvents {
    READY = 'ready',
    MESSAGE = 'message'
}

export default class BotController {
    private static _maxReconnectAttempt = 5
    private static _instance: BotController | null = null
    public static get instance() {
        if (!this._instance) {
            this._instance = new BotController()
        }

        return this._instance
    }

    public static get hasInstance() {
        return this._instance ? true : false
    }

    public static initInstance() {
        if (this.hasInstance) {
            this._instance!._removeListeners()
            this._instance!._bot.destroy()
            this._instance = null
        }

        this._instance = new BotController()
    }

    private _bot: Client
    private _handlers: { [key: string]: (...args: any[]) => void }
    private _reconnectAttemptsCount: number
    private _logger: Logger

    public config: BotConfig
    public music: MusicController
    public watcher: WatcherController | undefined
    public rating: RatingController | undefined

    constructor() {
        this._logger = new Logger('BotController')
        this._reconnectAttemptsCount = 0
        const intents = [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
        this._bot = new Client({ intents })
        this._bot.on('error', (e: any) => {
            this._logger.warn('Error occured in the bot client')
            this._logger.error(e)
        })
        this._handlers = {
            [BotEvents.READY]: this._ready.bind(this),
            [BotEvents.MESSAGE]: this._message.bind(this)
        }

        this.config = BotConfig.instance
        this.music = new MusicController(this._bot)

        if (this.config.getIPWatcher()) {
            this.watcher = new WatcherController(this._bot)
        }
        if (this.config.getRating()) {
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

    private _handleCommands(message: Message) {
        const content = message.content.substring(1)
        const { first, rest } = removeFirstWord(content)
        switch (first?.toLowerCase()) {
            case BotServices.WATCHER:
                this.watcher?.handleCommands(rest, message)
                break
            case BotServices.RATING:
                this.rating?.handleCommands(rest, message)
                break
            case BotServices.MUSIC:
            case BotServices.MUSIC_SHORT:
                this.music.handleCommands(rest, message)
                break
            default:
                // return message of service not available.
                break
        }
    }

    private _message(message: Message) {
        if (message.content.startsWith(this.config.getPrefix(message.guildId))) {
            this._handleCommands(message)
            return
        }
    }

    private async _connect() {
        try {
            await this._bot.login(process.env.BOT_TOKEN)
            await this.setPresence()
        } catch (e) {
            if (this._reconnectAttemptsCount < BotController._maxReconnectAttempt) {
                this._logger.log(`Attempting Reconnect #${this._reconnectAttemptsCount++ + 1}`)
                await delay(500)
                this._connect()
            } else {
                this._logger.warn('Max Reconnect Attempts Reached!')
                // this._logger.error('Error Occured', e)
            }
        }
    }

    public async setPresence(activities: ActivitiesOptions[] = []) {
        try {
            this._bot.guilds.cache.each(async (g: Guild) => {
                const presenceConfig: PresenceData = {
                    status: 'online',
                    activities: [
                        {
                            name: `Prefix: ${this.config.getPrefix(g.id)}`,
                            type: 'WATCHING'
                        },
                        ...activities
                    ]
                }
                await this._bot.guilds.cache.get(g.id)?.client.user?.setPresence(presenceConfig)
            })
        } catch (e) {
            this._logger.warn('Error Setting Presence')
            // this._logger.error('Error Occured', e)
        }
    }
}
