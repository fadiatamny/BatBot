const HourInMS = 3.6e6
import http from 'http'
import BotHandler from './BotHandler'

export default class Watcher {
    private static _instance: Watcher | null = null
    public static get instance() {
        if (!this._instance) {
            this._instance = new Watcher()
        }

        return this._instance
    }

    public static specificInstance(time: number) {
        if (this.instance) {
            this._instance = null
        }

        this._instance = new Watcher(time)
    }

    private _job?: NodeJS.Timer

    constructor(private _pollingInterval: number = HourInMS) {}

    private poll() {
        return new Promise<string>((resolve, reject) => {
            const options = {
                host: 'ipv4bot.whatismyipaddress.com',
                port: 80,
                path: '/'
            }

            http.get(options, function (res) {
                res.on('data', function (chunk) {
                    const ip = chunk.toString()
                    if (BotHandler.instance.ip !== ip) {
                        BotHandler.instance.setPresenceMessage(ip)
                    }
                    resolve(ip)
                })
            }).on('error', function (e) {
                console.log('error: ' + e.message)
                reject(e.message)
            })
        })
    }

    public start() {
        if (this._job) {
            return
        }
        this.poll()
        this._job = setInterval(this.poll, this._pollingInterval)
    }

    public stop() {
        if (!this._job) {
            return
        }

        clearInterval(this._job)
        this._job = undefined
    }

    public refresh() {
        this.stop()
        this.start()
    }
}
