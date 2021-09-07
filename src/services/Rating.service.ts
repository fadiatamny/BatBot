import { BotError } from '../models/BotError.model'
import { DbRating, Rating } from '../models/rating.model'
import { User } from '../models/user.model'
import { Logger } from '../utils/Logger'
import SQLiteConnector from '../utils/SQLiteConnector'

export default class RatingService {
    private _connector: SQLiteConnector
    private _logger: Logger

    constructor() {
        this._logger = new Logger('RatingService')
        this._connector = SQLiteConnector.instance
        this._generateTables()
    }

    private async _generateTables() {
        const statements: string[] = []

        statements.push(
            'CREATE TABLE IF NOT EXISTS `User` (\
            `id` TEXT UNIQUE PRIMARY KEY,\
            `displayName` TEXT NOT NULL)'
        )
        statements.push(
            'CREATE TABLE IF NOT EXISTS `Rating` (\
            `id` INTEGER UNIQUE PRIMARY KEY,\
            `category` TEXT NOT NULL,\
            `item` TEXT NOT NULL,\
            `rating` INTEGER NOT NULL,\
            `raterId` TEXT NOT NULL,\
            `date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,\
            FOREIGN KEY(raterId) REFERENCES user(id))'
        )
        try {
            await this._connector.execute(statements)
            this._logger.log('Tables are ready')
        } catch (e: any) {
            this._logger.error(e.message, e.error)
        }
    }

    public async addUserIfNotExist(user: User) {
        const query = `INSERT INTO User (id, displayName) VALUES (?, ?);`
        try {
            const u = await this.getUserDisplayName(user.id)
            if (u) {
                return
            }
            await this._connector.query(query, [user.id, user.displayName, user.id])
            this._logger.log('Successfully inserted new Rating')
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async getUserDisplayName(userId: string) {
        const query = `SELECT displayName FROM User WHERE id = ?;`
        try {
            const res = (await this._connector.get(query, [userId])) as User[]
            return res[0] ?? null
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async add(rating: Rating) {
        const query = `INSERT INTO Rating (category, item, rating, raterId) VALUES (?, ?, ?, ?);`
        try {
            await this._connector.query(query, [rating.category, rating.item, rating.rating, rating.raterId])
            this._logger.log('Successfully inserted new Rating')
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async remove(ratingId: number) {
        const query = `DELETE FROM rating WHERE id = ?;`
        try {
            await this._connector.query(query, [ratingId])
            this._logger.log('Successfully removed Rating ', ratingId)
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async update(ratingId: number, rating: Partial<Rating>) {
        let query = `UPDATE Rating `
        const params = []

        if (rating.category) {
            query += `category = ?`
            params.push(rating.category)
        }
        if (rating.item) {
            query += `item = ?`
            params.push(rating.item)
        }
        if (rating.rating) {
            query += `rating = ?`
            params.push(rating.rating)
        }

        query += `WHERE id = '${ratingId}';`

        try {
            await this._connector.query(query)
            this._logger.log('Successfully updated Rating ', ratingId)
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async get(ratingId: number) {
        const query = `SELECT * FROM Rating WHERE id = ?;`
        try {
            const res = (await this._connector.get(query, [ratingId])) as DbRating[]
            return res[0] ?? null
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async list() {
        const query = `SELECT * FROM Rating;`
        try {
            const res = (await this._connector.get(query)) as DbRating[]
            return res ?? []
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async query() {
        // lodash implementation of query over all objects of list.
        throw new BotError('Not Implemented', null)
    }
}
