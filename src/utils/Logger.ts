export class Logger {
    constructor(private _name: string) {}

    public log(...log: any) {
        console.log(`[${this._name}] - `, ...log)
    }
    public error(...log: any) {
        console.error(`[${this._name}] - `, ...log)
    }
    public warn(...log: any) {
        console.warn(`[${this._name}] - `, ...log)
    }
}
