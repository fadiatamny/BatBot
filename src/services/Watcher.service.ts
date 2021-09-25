import http from 'http'
import BotController from '../controllers/Bot.controller'
import { Logger } from '../utils/Logger'

const HourInMS = 3.6e6

export default class WatcherService {
    private _job: NodeJS.Timer | undefined
    private _logger: Logger

    constructor(private _pollingInterval: number = HourInMS) {
        this._logger = new Logger('WatcherService')
    }

    private _poll() {
        try {
            return new Promise<string>((resolve, reject) => {
                this._logger.log('started Polling')
                const options = {
                    host: 'ipv4bot.whatismyipaddress.com',
                    port: 80,
                    path: '/'
                }
                try {
                    http.get(options, function (res) {
                        res.on('data', function (chunk) {
                            const ip = chunk.toString()
                            BotController.instance?.watcher?.setPresenceMessage(ip)
                            resolve(ip)
                        })
                    }).on('error', function (e) {
                        reject(e.message)
                    })
                } catch (e: any) {
                    reject(e.message)
                } finally {
                    this._logger.log('finished Polling')
                }
            })
        } catch (e) {
            this._logger.warn('Error occured in watcher service')
            // this._logger.error(e)
            return ''
        }
    }

    public start() {
        if (this._job) {
            return
        }
        this._poll()
        this._job = setInterval(this._poll.bind(this), this._pollingInterval)
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
