import WatcherService from '../services/Watcher.service'
import { Client, Message } from 'discord.js'
import { enumKeys } from '../utils'
import BotController from './Bot.controller'

enum WatcherCommands {
    REFRESH = 'refresh',
    IP = 'ip',
    SET_IP = 'set ip'
}

export default class WatcherController {
    private _ip: string
    private _commands: { [key: string]: (...args: any[]) => void }
    private _service: WatcherService

    public get ip() {
        return this._ip
    }

    constructor(private _bot: Client) {
        this._ip = ''
        this._commands = {
            [WatcherCommands.IP]: this._ipCommand.bind(this),
            [WatcherCommands.REFRESH]: this._refreshCommand.bind(this),
            [WatcherCommands.SET_IP]: this._setIPCommand.bind(this)
        }
        this._service = new WatcherService()
    }

    private _refreshCommand(message: Message) {
        this._service.refresh()
        message.reply(`I've refreshed the watcher!`)
    }

    private _ipCommand(message: Message) {
        if (this.ip === '') {
            message.reply('The ip is not set yet.')
        } else {
            message.reply(`The ip is: ${this.ip}`)
        }
    }

    private _setIPCommand(message: Message) {
        if (this.ip === '') {
            message.reply('The ip is not set yet.')
        } else {
            this.setPresenceMessage(this.ip)
            message.reply(`IP set to: ${this.ip}`)
        }
    }

    private async _isInCorrectChannel() {
        const available = BotController.instance.config.ipwatcher!
        for (const c of available) {
            const guild = await this._bot.guilds.fetch(c.serverId)
            if (guild) {
                guild.channels.cache.map((channel) => {
                    if (channel.name === c.channelName || c.channelName === '*') {
                        return true
                    }
                })
            }
        }

        return false
    }

    public async handleCommands(content: string, message: Message) {
        const isInCorrectChannel = await this._isInCorrectChannel()
        if (!isInCorrectChannel) {
            return
        }
        for (const command of enumKeys(WatcherCommands)) {
            const key = WatcherCommands[command]
            if (content.startsWith(key)) {
                this._commands[key](message)
            }
        }
    }

    public async setPresenceMessage(ip: string) {
        const available = BotController.instance.config.ipwatcher!
        for (const c of available) {
            const guild = await this._bot.guilds.fetch(c.serverId)
            if (guild) {
                guild.channels.cache.map((channel) => {
                    if (channel.name === c.channelName || c.channelName === '*') {
                        channel.setTopic(`The Ip is: ${ip}`)
                    }
                })
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
