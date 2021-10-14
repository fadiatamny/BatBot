import { LogLevels, LogPriority } from '../models/BotConfig.model'
import { BotConfig } from '../services/BotConfig.service'

export class Logger {
    public get loggingLevel() {
        return BotConfig.instance.logLevel
    }

    constructor(private _name: string) {}

    private _getTime() {
        const date = new Date()
        return `${date.getDate()}/${date.getMonth() + 1} | ${date.getHours()}:${date.getMinutes()}`
    }

    public log(...log: any) {
        console.log(`(${this._getTime()}) [${this._name}]`, ...log)
    }
    public warn(...log: any) {
        if (LogPriority[this.loggingLevel] < LogPriority[LogLevels.WARN]) {
            return
        }
        console.warn(`(${this._getTime()}) [WARNING][${this._name}]`, ...log)
    }
    public error(...log: any) {
        if (LogPriority[this.loggingLevel] < LogPriority[LogLevels.ERROR]) {
            return
        }
        console.error(`(${this._getTime()}) [ERROR][${this._name}]`, ...log)
    }
}
