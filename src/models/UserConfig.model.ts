export interface WatcherConfig {
    serverId: string
    channelName: string
}

export interface MusicConfig {
    djRole: string
}

export interface UserConfig {
    ipwatcher: WatcherConfig[]
    prefix: string
    music: MusicConfig
}