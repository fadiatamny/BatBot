import WatcherService from '../services/Watcher.service'
import { Client, GuildChannel, Message, TextChannel, ThreadChannel } from 'discord.js'
import { enumKeys, removeFirstWord } from '../utils'
import BotController from './Bot.controller'
import { Logger } from '../utils/Logger'

enum WatcherCommands {
    HELP = 'help',
    REFRESH = 'refresh',
    IP = 'ip',
    SET_IP = 'set ip'
}

export default class WatcherController {
    private _ip: string
    private _commands: { [key: string]: (...args: any[]) => void }
    private _service: WatcherService
    private _logger: Logger

    public get ip() {
        return this._ip
    }

    constructor(private _bot: Client) {
        this._ip = ''
        this._commands = {
            [WatcherCommands.IP]: this._ipCommand.bind(this),
            [WatcherCommands.REFRESH]: this._refreshCommand.bind(this),
            [WatcherCommands.SET_IP]: this._setIPCommand.bind(this),
            [WatcherCommands.HELP]: this._helpCommand.bind(this)
        }
        this._service = new WatcherService()
        this._logger = new Logger('WatcherController')
    }
    private async _helpCommand(message: Message) {
        const embedded = {
            color: 0xffff00,
            title: 'Watcher Services',
            description: `Prefix: '**${BotController.instance.config.getPrefix(message.guildId)}**'watcher`,
            fields: [
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: false
                },
                {
                    name: 'IP',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}watcher ${WatcherCommands.IP}`,
                    inline: true
                },
                {
                    name: 'Refresh the Watcher',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}watcher ${
                        WatcherCommands.REFRESH
                    }`,
                    inline: true
                },
                {
                    name: 'Force Ip set',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}watcher ${
                        WatcherCommands.SET_IP
                    }`,
                    inline: true
                }
            ]
        }

        try {
            await message.reply({ embeds: [embedded] })
        } catch (e: any) {
            this._logger.warn('Error in help command')
            this._logger.error(e)
        }
    }

    private async _refreshCommand(message: Message) {
        try {
            this._service.refresh()
            await message.reply(`I've refreshed the watcher!`)
        } catch (e) {
            this._logger.warn(`Error occured in refreshCommand`)
            this._logger.error(e)
        }
    }

    private async _ipCommand(message: Message) {
        try {
            if (this.ip === '') {
                await message.reply('The ip is not set yet.')
            } else {
                await message.reply(`The ip is: ${this.ip}`)
            }
        } catch (e) {
            this._logger.warn(`Error occured in ip`)
            this._logger.error(e)
        }
    }

    private async _setIPCommand(message: Message) {
        try {
            if (this.ip === '') {
                await message.reply('The ip is not set yet.')
            } else {
                this.setPresenceMessage(this.ip)
                await message.reply(`IP set to: ${this.ip}`)
            }
        } catch (e) {
            this._logger.warn(`Error occured in setIP`)
            this._logger.error(e)
        }
    }

    private _isInCorrectChannel() {
        const available = BotController.instance.config.getIPWatcher()
        if (!available) {
            return false
        }

        return new Promise<boolean>(async (resolve, reject) => {
            for (const config of available) {
                try {
                    const guild = await this._bot.guilds.fetch(config.serverId)
                    if (guild) {
                        guild.channels.cache.map((channel: GuildChannel | ThreadChannel) => {
                            if (!channel.isText()) {
                                return
                            }
                            if (channel.name === config.channelName || config.channelName === '*') {
                                resolve(true)
                            }
                        })
                    }
                } catch (e) {
                    this._logger.warn(`Bot does not have access to the guild - ${config.serverId}`)
                    this._logger.error(e)
                }
            }

            resolve(false)
        })
    }

    public async handleCommands(content: string, message: Message) {
        try {
            const isInCorrectChannel = await this._isInCorrectChannel()
            if (!isInCorrectChannel) {
                return
            }
            const { first } = removeFirstWord(content)

            for (const command of enumKeys(WatcherCommands)) {
                const key = WatcherCommands[command]
                if (key === first) {
                    await this._commands[key](message)
                    return
                }
            }
        } catch (e) {
            this._logger.warn(`Error occured in handleCommands`)
            this._logger.error(e)
        }
    }

    public async setPresenceMessage(ip: string) {
        const available = BotController.instance.config.getIPWatcher()
        if (!available) {
            return
        }

        for (const config of available) {
            try {
                const guild = await this._bot.guilds.fetch(config.serverId)
                if (guild) {
                    guild.channels.cache.map((channel: GuildChannel | ThreadChannel) => {
                        if (!channel.isText()) {
                            return
                        }
                        const textChannel: TextChannel = channel as unknown as TextChannel
                        if (channel.name === config.channelName || config.channelName === '*') {
                            textChannel.setTopic(`The Ip is: ${ip}`)
                            this._logger.warn(`Bot set channel ${textChannel.name} of ${guild.name} to the ip`)
                        }
                    })
                }
            } catch (e) {
                this._logger.warn(`Bot does not have access to the guild - ${config.serverId}`)
                this._logger.error(e)
            }
        }
        this._ip = ip
    }

    public dispose() {
        this._ip = ''
    }

    public start() {
        this._service.start()
    }
}
