import { Rating } from '../models/rating.model'
import { Logger } from '../utils/Logger'
import SQLiteConnector from '../utils/SQLiteConnector'

export default class RatingService {
    private _connector: SQLiteConnector
    private _logger: Logger

    constructor() {
        this._logger = new Logger('RatingService')
        this._connector = new SQLiteConnector(process.env.DB_NAME)
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

    public async add(rating: Rating) {
        const query = `INSERT INTO rating (category, item, rating, raterId, date) VALUES (?, ?, ?, ?, ?);`
        try {
            await this._connector.query(query, [rating.catergory, rating.item, rating.rating, rating.raterId])

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
        let query = `UPDATE rating `
        const params = []

        if (rating.catergory) {
            query += `category = ?`
            params.push(rating.catergory)
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
        const query = `SELECT * FROM rating WHERE id = ?;`
        try {
            return await this._connector.get(query, [ratingId])
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }

    public async list() {
        const query = `SELECT * FROM rating;`
        try {
            return await this._connector.query(query)
        } catch (e: any) {
            this._logger.error(e.message, e.error)
            throw e
        }
    }
}
