import Watcher from '../services/Watcher.service'
import { Client, Message } from 'discord.js'
import { enumKeys } from '../utils'

enum WatcherCommands {
    REFRESH = 'refresh',
    IP = 'ip',
    SET_IP = 'set ip'
}

export default class WatcherHandler {
    private static _instance: WatcherHandler | null
    public static get instance() {
        return this._instance
    }
    public static generateInstace(bot: Client) {
        if (this._instance) {
            this._instance.dispose()
        }
        this._instance = null
        this._instance = new WatcherHandler(bot)
        return this._instance
    }

    private _ip: string
    private _commands: { [key: string]: (...args: any[]) => void }

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
    }

    private _refreshCommand(message: Message) {
        Watcher.instance.refresh()
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

    public handleCommands(content: string, message: Message) {
        for (const command of enumKeys(WatcherCommands)) {
            const key = WatcherCommands[command]
            if (content.startsWith(key)) {
                this._commands[key](message)
            }
        }
    }

    public setPresenceMessage(ip: string) {
        this._bot.user?.setPresence({
            status: 'online',
            activity: {
                name: ip,
                type: 'WATCHING'
            }
        })

        this._ip = ip
    }

    public dispose() {
        this._ip = ''
    }
}
