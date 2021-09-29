export interface WatcherConfig {
    serverId: string
    channelName: string
}

export interface MusicConfig {
    djRole?: string
    volume?: number
}

export interface RatingConfig {
    dbName: string
    categories: string[]
}

export enum LogLevels {
    DEBUG = 'DEBUG',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export const LogPriority: { [key: string]: number } = {
    [LogLevels.DEBUG]: 100,
    [LogLevels.WARN]: 200,
    [LogLevels.ERROR]: 300
}

export interface UserConfig {
    prefix: string
    music: MusicConfig
    ipwatcher?: WatcherConfig[]
    rating?: RatingConfig
}

export interface BotConfig {
    logLevel: LogLevels
    defaults: UserConfig
    servers?: { [key: string]: Partial<UserConfig> }
}
