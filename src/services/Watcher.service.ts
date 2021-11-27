import https from 'https'
import BotController from '../controllers/Bot.controller'
import { HourInMS } from '../utils'
import { Logger } from '../utils/Logger'

export default class WatcherService {
    private _job: NodeJS.Timer | undefined
    private _logger: Logger

    constructor(private _pollingInterval: number = HourInMS) {
        this._logger = new Logger('WatcherService')
    }

    private _poll() {
        const self = this
        try {
            return new Promise<string>((resolve, reject) => {
                this._logger.log('started Polling')
                const url = 'https://api.ipify.org?format=json'
                https.get(url, function (res) {
                    let body = ''
                    res.on('data', (chunk) => (body += chunk.toString()))
                    res.on('error', function (e) {
                        reject(e.message)
                    })
                    res.on('end', () => {
                        if (res.statusCode ?? (500 >= 200 && res.statusCode) ?? 500 <= 299) {
                            const response = JSON.parse(body.toString())
                            BotController.instance?.watcher?.setPresenceMessage(response.ip)
                            self._logger.log('finished Polling')
                            resolve(response.ip)
                        } else {
                            reject('Request failed. status: ' + res.statusCode + ', body: ' + body)
                        }
                    })
                })
            })
        } catch (e) {
            this._logger.warn('Error occured in watcher service while polling')
            this._logger.error(e)
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
