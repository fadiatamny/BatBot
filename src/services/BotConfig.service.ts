import { LogLevels, BotConfig as BotConfigModel, UserConfig } from '../models/BotConfig.model'
import { FileLoader } from './FileLoader.service'
import { cloneDeep } from 'lodash'
import { Dictionary } from '../models/Dictionary.model'
import { HourInMS } from '../utils'
import { Logger } from '../utils/Logger'

export class BotConfig implements BotConfigModel {
    private static _instance: BotConfig | null = null
    public static get instance() {
        if (!this._instance) {
            this._instance = new BotConfig()
        }

        return this._instance
    }

    private _logger: Logger
    private _filePath: string
    private _logLevel: LogLevels
    private _defaults: UserConfig
    private _servers?: { [key: string]: UserConfig }
    private _interval: NodeJS.Timer | null

    constructor() {
        this._logger = new Logger('BotConfigService')
        this._filePath = `../../${process.env.NODE_ENV ?? 'development'}.config.json`
        this._logLevel = (process.env.LOG_LEVEL ?? LogLevels.DEBUG) as LogLevels
        const data = FileLoader.loadFromFile(this._filePath)

        if (data) {
            const config = JSON.parse(data) as Dictionary
            this._logLevel = config.logLevel ?? this._logLevel
            this._defaults = cloneDeep(config.default)
            this._servers = {}

            for (const [key, value] of Object.entries(config.servers as { [key: string]: UserConfig })) {
                this._servers[key] = cloneDeep(value)
            }
        } else {
            this._defaults = {
                prefix: process.env.BOT_PREFIX ?? '!',
                music: {
                    djRole: '*'
                }
            }
        }

        this._interval = setInterval(this._dumpConfigToFile.bind(this), HourInMS)
    }

    private _toJson (): Dictionary {
        return {
            logLevel: this._logLevel,
            defaults: this._defaults,
            servers: this._servers
        }
    }

    private _dumpConfigToFile() {
        this._logger.log('Dumping config to file')
        const obj = this._toJson()
        FileLoader.dumpToFile(this._filePath, JSON.stringify(obj))
    }

    public saveConfig () {
        if (this._interval) {
            clearInterval(this._interval)
            this._interval = null
        }

        this._dumpConfigToFile()
        this._interval = setInterval(this._dumpConfigToFile.bind(this), HourInMS)
    }

    public get logLevel() {
        return this._logLevel
    }
    public get defaults() {
        return this._defaults
    }
    public get servers() {
        return this._servers
    }

    private _getGuildConfig(guildId?: string | null) {
        return this._servers && guildId ? this._servers[guildId] : null
    }

    public getMusic(guildId?: string | null) {
        return this._getGuildConfig(guildId)?.music ?? this._defaults.music
    }

    public getPrefix(guildId?: string | null) {
        return this._getGuildConfig(guildId)?.prefix ?? this._defaults.prefix
    }

    public getIPWatcher(guildId?: string | null) {
        return this._getGuildConfig(guildId)?.ipwatcher ?? this._defaults.ipwatcher
    }

    public getRating(guildId?: string | null) {
        return this._getGuildConfig(guildId)?.rating ?? this._defaults.rating
    }
}
