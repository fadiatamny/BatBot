import { Database } from 'sqlite3'

export default class SQLiteConnector {
    private _db: Database

    constructor(fileName?: string) {
        const dbPath = `../database/${fileName ?? 'database.sqlite'}`
        this._db = new Database(dbPath, (err) => {
            if (err) {
                throw {
                    status: 500,
                    message: 'Error performing connection',
                    err: err
                }
            }
        })

        this._db.configure('busyTimeout', 1000)
    }

    public async get(sql: string, params: any[]) {
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

    public async query(sql: string, params: any[]) {
        return new Promise((resolve, reject) => {
            this._db.run(sql, params, (err) => {
                if (err) reject(err)
                else resolve(undefined)
            })
        })
    }
}
