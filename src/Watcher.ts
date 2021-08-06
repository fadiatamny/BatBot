import http from 'http'
import BotHandler from './BotHandler'

const HourInMS = 3.6e6

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

    private _poll() {
        try {
            return new Promise<string>((resolve, reject) => {
                const options = {
                    host: 'ipv4bot.whatismyipaddress.com',
                    port: 80,
                    path: '/'
                }
                try {
                    http.get(options, function (res) {
                        res.on('data', function (chunk) {
                            const ip = chunk.toString()
                            if (BotHandler.instance.ip !== ip) {
                                BotHandler.instance.setPresenceMessage(ip)
                            }
                            resolve(ip)
                        })
                    }).on('error', function (e) {
                        reject(e.message)
                    })
                } catch (e) {
                    reject(e.message)
                }
            })
        } catch (e) {
            console.log(e)
            return ''
        }
    }

    public start() {
        if (this._job) {
            return
        }
        this._poll()
        this._job = setInterval(this._poll, this._pollingInterval)
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
