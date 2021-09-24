import { Logger } from './Logger'

export interface Work {
    id: string
    callback: () => void | Promise<void>
}

export class WorkQueue {
    private _queue: Work[]
    private _interval: NodeJS.Timer | null = null
    private _logger: Logger

    constructor(private _executionInterval = 500) {
        this._logger = new Logger('WorkQueue')
        this._queue = []
    }

    private _clearInterval() {
        if (this._interval) {
            clearInterval(this._interval)
            this._interval = null
        }
    }

    private async _execute() {
        if (this._queue.length) {
            const work = this._queue.pop()
            try {
                await work?.callback()
            } catch (e) {
                this._logger.error('Error occured while executing ', work?.id)
            } finally {
                this._clearInterval()
                this._interval = setTimeout(this._execute.bind(this), this._executionInterval)
            }
        } else {
            this.clear()
        }
    }

    private async _process() {
        if (this._interval) {
            return
        }
        this._interval = setTimeout(this._execute.bind(this), this._executionInterval)
    }

    public add(work: Work) {
        this._queue.unshift(work)
        this._process()
    }

    public clear() {
        this._clearInterval()
        this._queue = []
    }
}
