import path from 'path'
import { Database, OPEN_READWRITE, OPEN_CREATE } from 'sqlite3'
import { BotError } from '../models/BotError.model'
import { WorkQueue } from './WorkQueue'

export default class SQLiteConnector {
    private static _instance: SQLiteConnector | null
    public static get instance() {
        if (!this._instance) {
            this._instance = new SQLiteConnector(`${process.env.DB_NAME}.db.sqlite`)
        }
        return this._instance
    }

    private _workQueue: WorkQueue
    private _db: Database

    constructor(fileName?: string) {
        this._workQueue = new WorkQueue()
        const dbPath = path.resolve(__dirname, `../database/${fileName ?? 'db.sqlite'}`)
        this._db = new Database(dbPath, OPEN_READWRITE | OPEN_CREATE, (err) => {
            if (err) {
                throw new BotError('Error performing connection', err)
            }
        })

        this._db.configure('busyTimeout', 1000)
    }

    public async get(sql: string, params?: any[]) {
        return new Promise((resolve, reject) => {
            this._db.serialize(() => {
                this._db.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (rows) {
                        resolve(rows)
                        return
                    }
                })
            })
        })
    }

    public async query(sql: string, params?: any[]) {
        return new Promise((resolve, reject) => {
            this._db.run(sql, params, (err) => {
                if (err) reject(err)
                else resolve(undefined)
            })
        })
    }

    public async execute(sql: string[], params?: any[][]) {
        this._workQueue.add({
            id: Date.now().toString(),
            callback: async () => {
                try {
                    await this.query('BEGIN;')
                    for (let i = 0; i < sql.length; ++i) {
                        await this.query(sql[i], params ? params[i] : undefined)
                    }
                    await this.query('COMMIT;')
                } catch (e) {
                    await this.query('ROLLBACK;')
                    throw new BotError('Transaction Failed', e)
                }
            }
        })
    }
}
