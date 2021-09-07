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
            'CREATE TABLE IF NOT EXISTS `user` (\
            `id` TEXT UNIQUE PRIMARY KEY,\
            `displayName` TEXT NOT NULL)'
        )
        statements.push(
            'CREATE TABLE IF NOT EXISTS `rating` (\
            `id` INTEGER UNIQUE PRIMARY KEY,\
            `category` TEXT NOT NULL,\
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
}
