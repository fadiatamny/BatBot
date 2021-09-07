import http from 'http'
import WatcherHandler from '../controllers/Watcher.controller'

const HourInMS = 3.6e6

export default class WatcherService {
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
                            WatcherHandler.instance?.setPresenceMessage(ip)
                            resolve(ip)
                        })
                    }).on('error', function (e) {
                        reject(e.message)
                    })
                } catch (e: any) {
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
