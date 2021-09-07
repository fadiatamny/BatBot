export interface BotError {
    message: string
    error: any
}

export class BotError implements BotError {
    message: string
    error: any

    constructor(message: string, error?: any) {
        this.message = message
        this.error = error
    }
}
