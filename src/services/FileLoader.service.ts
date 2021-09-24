import fs from 'fs'
import path from 'path'
import { Logger } from '../utils/Logger'

export class FileLoader {
    private static _logger: Logger = new Logger('FileLoader')

    public static fileExists(filePath: string) {
        return fs.existsSync(filePath)
    }

    public static loadFromFile(filePath: string, encoding: BufferEncoding = 'utf8') {
        try {
            const fullPath = path.join(__dirname, filePath)
            if (!this.fileExists(fullPath)) {
                throw Error('File doesnt exits')
            }
            return fs.readFileSync(fullPath, { encoding })
        } catch (e) {
            this._logger.warn(e)
            return null
        }
    }

    public static dumpToFile(filePath: string, data: string) {
        try {
            const fullPath = path.join(__dirname, filePath)
            fs.writeFileSync(fullPath, data)
        } catch (e) {
            this._logger.warn(e)
        }
    }
}
