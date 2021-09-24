export interface WatcherConfig {
    serverId: string
    channelName: string
}

export interface MusicConfig {
    djRole: string
}

export interface RatingConfig {
    dbName: string
    categories: string[]
}

export interface UserConfig {
    prefix: string
    music: MusicConfig
    ipwatcher?: WatcherConfig[]
    rating?: RatingConfig
}
