import { MusicConfig, RatingConfig, UserConfig as UserConfigModel, WatcherConfig } from '../models/UserConfig.model'
import { FileLoader } from './FileLoader.service'
import { cloneDeep } from 'lodash'

export class UserConfig implements UserConfigModel {
    private _prefix: string
    private _music: MusicConfig
    private _ipWatcher?: WatcherConfig[]
    private _rating?: RatingConfig

    constructor() {
        const data = FileLoader.loadFromFile(`../../${process.env.NODE_ENV ?? 'development'}.config.json`)
        if (data) {
            const obj = JSON.parse(data) as Partial<UserConfigModel>

            this._prefix = obj.prefix ?? process.env.BOT_PREFIX ?? '!'
            this._music = cloneDeep(
                obj.music ?? {
                    djRole: '*'
                }
            )

            if (obj.ipwatcher) {
                this._ipWatcher = [...cloneDeep(obj.ipwatcher ?? [])]
            }
            if (obj.rating) {
                this._rating = cloneDeep(obj.rating)
            }
        } else {
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

    public get rating() {
        return this._rating
    }
}
