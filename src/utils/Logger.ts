import { LogLevels, LogPriority } from '../models/BotConfig.model'
import { BotConfig } from '../services/BotConfig.service'

export class Logger {
    public get loggingLevel() {
        return BotConfig.instance.logLevel
    }

    constructor(private _name: string) {}

    public log(...log: any) {
        const date = new Date()
        console.log(`(${date.getHours()}:${date.getMinutes()}) [${this._name}]`, ...log)
    }
    public error(...log: any) {
        if (LogPriority[this.loggingLevel] < LogPriority[LogLevels.ERROR]) {
            return
        }
        const date = new Date()
        console.error(`(${date.getHours()}:${date.getMinutes()}) [${this._name}]`, ...log)
    }
    public warn(...log: any) {
        if (LogPriority[this.loggingLevel] < LogPriority[LogLevels.WARN]) {
            return
        }
        const date = new Date()
        console.warn(`(${date.getHours()}:${date.getMinutes()}) [${this._name}]`, ...log)
    }
}
