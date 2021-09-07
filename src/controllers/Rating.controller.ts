import RatingService from '../services/Rating.service'
import { Client, Message, MessageEmbed } from 'discord.js'
import { enumKeys, removePrefix } from '../utils'
import { Rating, RatingCategories } from '../models/rating.model'
import { BotError } from '../models/BotError.model'
import { Logger } from '../utils/Logger'

enum RatingComamnds {
    RATE = 'rate',
    LIST = 'list'
}

export default class RatingController {
    private _commands: { [key: string]: (...args: any[]) => void }
    private _service: RatingService
    private _logger: Logger

    constructor(private _bot: Client) {
        this._commands = {
            [RatingComamnds.RATE]: this._rateCommand.bind(this),
            [RatingComamnds.LIST]: this._listCommand.bind(this)
        }
        this._service = new RatingService()
        this._logger = new Logger('RatingController')
    }

    private async _rateCommand(content: string, message: Message) {
        try {
            await this._service.addUserIfNotExist({ id: message.author.id, displayName: message.author.username })
            const ratingCategories = Object.values(RatingCategories) as string[]
            const parameters = content.split(' ')
            if (parameters.length !== 3) {
                throw new BotError('Missing Parameters! please include the Category, Item and rating')
            }

            if (!ratingCategories.includes(parameters[0])) {
                throw new BotError('Category is not supported by rating service')
            }

            const rating: Rating = {
                category: parameters[0] as RatingCategories,
                item: parameters[1],
                rating: Number(parameters[2]),
                raterId: message.author.id
            }

            await this._service.add(rating)
            message.reply(`Successfully added your rating!`)
        } catch (e: any) {
            message.reply(`There was an error adding your rating.`)
            this._logger.error(e)
        }
    }

    private async _listCommand(content: string, message: Message) {
        try {
            const parameters = content.split(' ')
            if (parameters.length && parameters[0] !== '') {
                // query
            } else {
                const ratings = await this._service.list()
                const embedded = new MessageEmbed()
                embedded.title = 'Ratings'
                embedded.addField(
                    '#\t\tCategory\t\t\tItem\t\t\tRating\t\tRater\t\tDate',
                    '------------------------------------------------------------------------------',
                    false
                )
                for (const rating of ratings) {
                    const rater = await this._service.getUserDisplayName(rating.raterId)
                    if (!rater) {
                        throw new BotError('Error occured trying to fetch rater name')
                    }
                    embedded.addField(
                        `#${rating.id}\t\t${rating.category}\t\t\t${rating.item}\t\t\t${rating.rating}\t\t${rater.displayName}\t\t${rating.date}`,
                        '---',
                        false
                    )
                }
                message.channel.send(embedded)
            }
        } catch (e: any) {
            message.reply(`There was an error listing the rating`)
            this._logger.error(e)
        }
    }
    public handleCommands(content: string, message: Message) {
        for (const command of enumKeys(RatingComamnds)) {
            const key = RatingComamnds[command]
            if (content.startsWith(key)) {
                content = removePrefix(content, key.length)
                this._commands[key](content, message)
            }
        }
    }
}
