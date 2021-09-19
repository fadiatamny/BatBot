import { MusicConfig, UserConfig as UserConfigModel, WatcherConfig } from '../models/UserConfig.model'
import { FileLoader } from './FileLoader.service'
import { cloneDeep } from 'lodash'

export class UserConfig implements UserConfigModel {
    private _ipWatcher: WatcherConfig[]
    private _prefix: string
    private _music: MusicConfig

    constructor() {
        const data = FileLoader.loadFromFile('../../.config.json')
        if (data) {
            const obj = JSON.parse(data) as Partial<UserConfigModel>
            this._ipWatcher = [...cloneDeep(obj.ipwatcher ?? [])]
            this._music = cloneDeep(
                obj.music ?? {
                    djRole: '*'
                }
            )
            this._prefix = obj.prefix ?? process.env.BOT_PREFIX ?? '!'
        } else {
            this._ipWatcher = []
            this._prefix = process.env.BOT_PREFIX ?? '!'
            this._music = {
                djRole: '*'
            }
        }
    }

    public get music() {
        return this._music
    }

    public get prefix() {
        return this._prefix
    }

    public get ipwatcher() {
        return this._ipWatcher
    }
}
