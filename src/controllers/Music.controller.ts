import { Client, Message, MessageEmbed, MessageEmbedOptions, Role } from 'discord.js'
import { Logger } from '../utils/Logger'
import { WorkQueue } from '../utils/WorkQueue'
import { delay, enumKeys, removeFirstWord } from '../utils'
import { BotError } from '../models/BotError.model'
import BotController from './Bot.controller'
import { Player, Playlist, Queue, RepeatMode, Song } from 'discord-music-player'
import { isEmpty, isNumber } from 'lodash'

enum MusicCommands {
    HELP = 'help',
    PLAY = 'add',
    PLAYLIST = 'playlist',
    MULTI = 'multi',
    PLAYING = 'playing',
    SKIP = 'skip',
    STOP = 'stop',
    DISCONNECT = 'disconnect',
    DC = 'dc',
    CLEAR = 'clear',
    REMOVE = 'remove',
    SHUFFLE = 'shuffle',
    PAUSE = 'pause',
    RESUME = 'resume',
    REPEAT = 'repeat'
}

export default class MusicController {
    private _commands: { [key: string]: (...args: any[]) => void }
    private _logger: Logger
    private _player: Player
    private _workQueue: WorkQueue
    private _addedInitialTrack: boolean

    constructor(private _bot: Client) {
        this._commands = {
            [MusicCommands.HELP]: this._helpCommand.bind(this),
            [MusicCommands.PLAY]: this._playCommand.bind(this),
            [MusicCommands.PLAYLIST]: this._playlistCommand.bind(this),
            [MusicCommands.MULTI]: this._multiTrackCommand.bind(this),
            [MusicCommands.PLAYING]: this._playingCommand.bind(this),
            [MusicCommands.SKIP]: this._skipCommand.bind(this),
            [MusicCommands.STOP]: this._stopCommand.bind(this),
            [MusicCommands.DISCONNECT]: this._disconnectCommand.bind(this),
            [MusicCommands.DC]: this._disconnectCommand.bind(this),
            [MusicCommands.CLEAR]: this._clearCommand.bind(this),
            [MusicCommands.REMOVE]: this._removeCommand.bind(this),
            [MusicCommands.SHUFFLE]: this._shuffleCommand.bind(this),
            [MusicCommands.PAUSE]: this._pauseCommand.bind(this),
            [MusicCommands.RESUME]: this._resumeCommand.bind(this),
            [MusicCommands.REPEAT]: this._repeatCommand.bind(this)
        }
        this._addedInitialTrack = true

        this._workQueue = new WorkQueue()
        this._player = new Player(this._bot, {
            leaveOnEmpty: true,
            leaveOnStop: true,
            leaveOnEnd: true,
            timeout: 60000
        })
        this._logger = new Logger('MusicController')

        this._player
            .on('playlistAdd', async (queue: Queue, playlist: Playlist) => {
                try {
                    const position = queue.songs.indexOf(playlist.songs[0]) + 1
                    await queue.data.message.reply({
                        embeds: [
                            {
                                color: '#00ff00',
                                title: playlist.name,
                                author: {
                                    name: 'Playlist added to queue',
                                    icon_url: playlist.songs[0].requestedBy?.avatarURL(),
                                    url: playlist.url
                                },
                                fields: [
                                    {
                                        name: 'Position in queue',
                                        value: position.toString(),
                                        inline: true
                                    },
                                    {
                                        name: 'Enqueued',
                                        value: playlist.songs.length.toString(),
                                        inline: true
                                    }
                                ]
                            }
                        ]
                    })
                } catch (e: any) {
                    this._logger.error(e)
                }
            })
            .on('songAdd', async (queue: Queue, song: Song) => {
                if (this._addedInitialTrack) {
                    this._addedInitialTrack = false
                    return // means its initial track and we dont need to notify we added it to a queue.
                }

                const embedded = this._songEmbedded(queue, song, 'Added to queue', true)
                try {
                    await song.data?.message?.reply({ embeds: [embedded] })
                } catch (e) {
                    this._logger.warn('There was an error with songAdd')
                    this._logger.error(e)
                }
            })
            .on('songFirst', async (queue: Queue, song: Song) => {
                this._addedInitialTrack = false
                const embedded = this._songEmbedded(queue, song, 'Started Playing').setColor('#0099ff')

                try {
                    await queue.data?.message?.channel.send({ embeds: [embedded] })
                } catch (e) {
                    this._logger.warn('There was an error with songFirst')
                    this._logger.error(e)
                }
            })
            .on('songChanged', async (queue: Queue, newSong: Song) => {
                const embedded = this._songEmbedded(queue, newSong, 'Now Playing').setColor('#0099ff')

                try {
                    await queue.data?.message?.channel.send({ embeds: [embedded] })
                } catch (e) {
                    this._logger.warn('There was an error with songChanged')
                    this._logger.error(e)
                }
            })
            .on('queueEnd', async (queue: Queue) => {
                this._addedInitialTrack = true
                const embedded = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('Queue is over')
                    .setDescription('The queue has ended.')

                try {
                    await queue.data?.message?.channel.send({ embeds: [embedded] })
                } catch (e) {
                    this._logger.warn('There was an error with queueEnd')
                    this._logger.error(e)
                }
            })
            .on('channelEmpty', (queue: Queue) => {
                this._logger.log('channel is empty - guild: ' + queue.guild.name)
            })
            .on('clientDisconnect', (queue: Queue) => {
                this._logger.log('clientDisconnect - guild: ' + queue.guild.name)
                this._workQueue.clear()
                if (queue) queue.destroy()
            })
            .on('error', (e: any) => {
                this._logger.warn('error occured with the discord-music-player instance')
                this._logger.error(e)
            })
    }

    private _songEmbedded(queue: Queue, song: Song, name: string, queued = false, current = false) {
        const embedded = new MessageEmbed()
        try {
            embedded
                .setColor('#00ff00')
                .setTitle(song.name)
                .setURL(song.url)
                .setAuthor(name, song.requestedBy?.avatarURL() ?? undefined, song.url)
                .addFields(
                    { name: 'Channel', value: song.author, inline: true },
                    {
                        name: 'Song Duration',
                        value: current ? queue.createProgressBar().times : song.duration,
                        inline: true
                    },
                    { name: 'Requested by', value: song.requestedBy?.username ?? 'unkown', inline: true }
                )
                .setThumbnail(song.thumbnail)
            if (queued) {
                embedded.addFields({
                    name: 'Position in queue',
                    value: (queue.songs.indexOf(song) + 1).toString(),
                    inline: false
                })
            }
        } catch (e: any) {
            this._logger.error(e)
        }
        return embedded
    }

    private async _helpCommand(message: Message) {
        const embedded = {
            color: 0xffff00,
            title: 'Music Commands',
            description: `Prefix: '**${BotController.instance.config.getPrefix(
                message.guildId
            )}queue**' or '**${BotController.instance.config.getPrefix(message.guildId)}q**' for short`,
            fields: [
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: false
                },
                {
                    name: 'Queue song',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.PLAY} <song>`,
                    inline: true
                },
                {
                    name: 'Queue playlist',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${
                        MusicCommands.PLAYLIST
                    } <playlist>`,
                    inline: true
                },
                {
                    name: 'Queue multi tracks',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${
                        MusicCommands.MULTI
                    } <Track links or names seperated by a new line>`,
                    inline: true
                },
                {
                    name: 'Display current song',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.PLAYING}`,
                    inline: true
                },
                {
                    name: 'Skip song',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.SKIP}`,
                    inline: true
                },
                {
                    name: 'Dequeue song',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${
                        MusicCommands.REMOVE
                    } <position>`,
                    inline: true
                },
                {
                    name: 'Shuffle queue',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.SHUFFLE}`,
                    inline: true
                },
                {
                    name: 'Repeat queue',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.REPEAT}`,
                    inline: true
                },
                {
                    name: 'Display queue',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q <#>`,
                    inline: true
                },
                {
                    name: 'Pause music',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.PAUSE}`,
                    inline: true
                },
                {
                    name: 'Resume music',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.RESUME}`,
                    inline: true
                },
                {
                    name: 'Stop & clear queue',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.STOP}`,
                    inline: true
                },
                {
                    name: 'Clear queue',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.CLEAR}`,
                    inline: true
                },
                {
                    name: 'Disconnect bot',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.DISCONNECT}/${
                        MusicCommands.DC
                    }`,
                    inline: true
                },
                {
                    name: 'Show available commands',
                    value: `${BotController.instance.config.getPrefix(message.guildId)}q ${MusicCommands.HELP}`,
                    inline: true
                }
            ]
        }
        try {
            await message.reply({ embeds: [embedded] })
        } catch (e) {
            this._logger.warn('There was an error with helpCommand')
            this._logger.error(e)
        }
    }

    private async _isInChannel(message: Message) {
        if (!message.member?.voice.channel) {
            await message.reply('You need to be in a voice channel to queue music!')
            return false
        }
        if (
            message.guild!.me &&
            message.guild!.me.voice.channel &&
            message.member!.voice.channel !== message.guild!.me.voice.channel
        ) {
            await message.reply(`I'm already occupied in another voice channel!`)
            return false
        }

        return true
    }

    private async _initQueue(message: Message) {
        const guildQueue = this._player.getQueue(message.guild!.id)

        const queue = this._player.createQueue(message.guild!.id, {
            data: {
                message: message
            }
        })

        await queue.join(message.member!.voice.channel!)

        return { guildQueue, queue }
    }

    private async _multiTrackCommand(message: Message, content: string) {
        try {
            const inChannel = await this._isInChannel(message)
            if (!inChannel) {
                return
            }

            const { guildQueue, queue } = await this._initQueue(message)

            const embed: MessageEmbedOptions = {
                color: '#ff6e00',
                title: 'The following songs have been added:',
                fields: []
            }

            const errored: string[] = []
            const list: string[] = content.split('\n').filter((val) => val !== '')
            for (let i = 0; i < list.length; ++i) {
                const song = await queue
                    .play(list[i], {
                        requestedBy: message.member?.user
                    })
                    .catch((e: any) => {
                        this._logger.warn(`queue.play catch`)
                        this._logger.error(e)
                        if (!guildQueue) queue.stop()
                    })
                if (!song) {
                    errored.push(list[i])
                } else {
                    embed.fields?.push({
                        name: song.name,
                        value: song.url,
                        inline: false
                    })
                }
            }

            if (errored.length) {
                embed.fields?.push({
                    name: '------------------------------',
                    value: '------------------------------',
                    inline: false
                })
                embed.fields?.push({
                    name: 'Following Songs Failed:',
                    value: errored.join('\n'),
                    inline: false
                })
            }

            await message.reply({ embeds: [embed] })
        } catch (e: any) {
            this._logger.warn('There was an error with multiTrackCommand')
            this._logger.error(e)
        }
    }

    private async _playlistCommand(message: Message, content: string) {
        try {
            const inChannel = await this._isInChannel(message)
            if (!inChannel) {
                return
            }

            const { guildQueue, queue } = await this._initQueue(message)
            await message.reply('🎵 Searching 🔎 `' + content + '`')
            const playlist = await queue
                .playlist(content, {
                    requestedBy: message.member?.user
                })
                .catch((e: any) => {
                    this._logger.warn(`queue.playlist catch`)
                    this._logger.error(e)
                    if (!guildQueue) queue.stop()
                })

            if (!playlist) {
                await message.reply(
                    `❌ | your playlist couldn't be found, if it's a song try '**${MusicCommands.PLAY}**' instead of '**${MusicCommands.PLAYLIST}**'`
                )
            }
        } catch (e: any) {
            this._logger.warn('There was an error with playlistCommand')
            this._logger.error(e)
        }
    }

    private async _playCommand(message: Message, content: string) {
        try {
            const inChannel = await this._isInChannel(message)
            if (!inChannel) {
                return
            }

            const { guildQueue, queue } = await this._initQueue(message)

            await message.reply('🎵 Searching 🔎 `' + content + '`')
            const song = await queue
                .play(content, {
                    requestedBy: message.member?.user,
                    data: {
                        message: message,
                        nickname: message.member?.displayName
                    }
                })
                .catch((e: any) => {
                    this._logger.warn(`queue.play catch`)
                    this._logger.error(e)
                    if (!guildQueue) queue.stop()
                })
            if (!song) {
                await message.reply(
                    `❌ | your song couldn't be found, if it's a playlist try '**${MusicCommands.PLAYLIST}**' instead of '**${MusicCommands.PLAY}**'`
                )
                return
            }
        } catch (e: any) {
            this._logger.warn('There was an error with playCommand')
            this._logger.error(e)
        }
    }

    private async _playingCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                await message.reply('❌ | No music is being played!')
                return
            }
            const embedded = this._songEmbedded(
                guildQueue,
                guildQueue.nowPlaying,
                'Currently Playing',
                false,
                true
            ).setColor('#0099ff')
            await message.reply({ embeds: [embedded] })
        } catch (e: any) {
            this._logger.warn('There was an error with playCommand')
            this._logger.error(e)
        }
    }

    private async _skipCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                await message.reply('❌ | No music is being played!')
                return
            }
            const song = guildQueue?.skip()
            await message.reply(song ? `✅ | Skipped **${song}**!` : '❌ | Something went wrong!')
        } catch (e: any) {
            this._logger.warn('There was an error with skipCommand')
            this._logger.error(e)
        }
    }

    private async _pauseCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                await message.reply('❌ | No music is being played!')
                return
            }
            guildQueue.setPaused(true)
            await message.reply({
                embeds: [
                    {
                        color: '#FFA500',
                        title: 'Paused',
                        description: `Music has been paused.`
                    }
                ]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with pauseCommand')
            this._logger.error(e)
        }
    }

    private async _resumeCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                await message.reply('❌ | No music is being played!')
                return
            }
            guildQueue.setPaused(false)
            await message.reply({
                embeds: [
                    {
                        color: '#0099ff',
                        title: 'Resumed',
                        description: `Music has been resumed.`
                    }
                ]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with resumeCommand')
            this._logger.error(e)
        }
    }

    private async _shuffleCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                await message.reply('❌ | Queue is empty!')
                return
            }
            guildQueue.shuffle()
            await message.reply(`✅ | Queue has been shuffled.`)
        } catch (e: any) {
            this._logger.warn('There was an error with shuffleCommand')
            this._logger.error(e)
        }
    }

    private async _repeatCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                await message.reply('❌ | Queue is empty!')
                return
            }

            if (guildQueue.repeatMode === RepeatMode.DISABLED) {
                guildQueue.setRepeatMode(RepeatMode.QUEUE)
                await message.reply(`✅ | Queue Repeate is on.`)
            } else {
                guildQueue.setRepeatMode(RepeatMode.DISABLED)
                await message.reply(`✅ | Queue Repeate is off.`)
            }
        } catch (e: any) {
            this._logger.warn('There was an error with repeatCommand')
            this._logger.error(e)
        }
    }

    private async _clearCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                await message.reply('❌ | Queue is empty!')
                return
            }
            guildQueue.clearQueue()
            await message.reply(`✅ | Queue was cleared.`)
        } catch (e: any) {
            this._logger.warn('There was an error with clearCommand')
            this._logger.error(e)
        }
    }

    private async _stopCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || (!guildQueue.isPlaying && (!guildQueue.songs || !guildQueue.songs.length))) {
                await message.reply('❌ | No music to stop and no queue to clear!')
                return
            }
            this._addedInitialTrack = true
            guildQueue.stop()
            await message.reply({
                embeds: [
                    {
                        color: '#ff0000',
                        title: 'Stopped',
                        description: `Music has stopped.\nQueue has been cleared.`
                    }
                ]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with stopCommand')
            this._logger.error(e)
        }
    }

    private async _disconnectCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.connection) {
                await message.reply(`❌ | I'm not connected to a voice channel!`)
                return
            }
            this._addedInitialTrack = true
            guildQueue.destroy()
            await message.reply({
                embeds: [
                    {
                        color: '#ff0000',
                        title: 'Disconnected',
                        description: `I've been disconnected.`
                    }
                ]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with stopCommand')
            this._logger.error(e)
        }
    }

    private async _queueCommand(message: Message, content?: string) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                await message.reply('❌ | Queue is empty!')
                return
            }
            let index = 1
            if (content && content.length) {
                index = parseInt(content)
                if (index === NaN) {
                    index = 1
                }
            }
            const queueLength = guildQueue.songs.length
            if (10 * (index - 1) >= queueLength || 10 * (index - 1) < 0) {
                await message.reply('❌ | page index invalid! displaying 1st page..')
                index = 1
            }
            const start = 10 * (index - 1)
            const end = start + 10
            let queueDuration = 0
            for (let i = 0; i < queueLength; i++) {
                queueDuration += guildQueue.songs[i].millisecons
            }
            queueDuration = Math.floor(queueDuration / 1000)
            const hours = Math.floor(queueDuration / 3600)
            const minutes = Math.floor((queueDuration - hours * 3600) / 60)
            const seconds = queueDuration - hours * 3600 - minutes * 60
            const songs = guildQueue.songs.slice(start, end).map((song: { duration: any; url: any }, i: number) => {
                if (i === 0 && start === 0) {
                    return ''
                }
                return `${i + start + 1}. **${song}** - ${song.duration}\n\ \ [${song.url}]`
            })

            const embedded = {
                color: 0x00ff00,
                title: 'Music Queue',
                description: `${songs.join('\n')}`,
                fields: [
                    {
                        name: 'Currently Playing',
                        value: `▶ | **${guildQueue.nowPlaying}**\n 🕒 | **${
                            guildQueue.createProgressBar().times
                        }**\n📃 | [${guildQueue.nowPlaying.url}]\n`,
                        inline: false
                    },
                    {
                        name: 'Total Songs',
                        value: queueLength.toString(),
                        inline: true
                    },
                    {
                        name: 'Pages',
                        value: `${index}/${Math.ceil(queueLength / 10)}`,
                        inline: true
                    },
                    {
                        name: 'Estimated Duration',
                        value:
                            (hours
                                ? `${hours.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}:`
                                : '') +
                            `${minutes.toLocaleString('en-US', {
                                minimumIntegerDigits: 2,
                                useGrouping: false
                            })}:${seconds.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}`,
                        inline: true
                    }
                ]
            }

            await message.reply({ embeds: [embedded] })
        } catch (e: any) {
            this._logger.warn('There was an error with queue')
            this._logger.error(e)
        }
    }

    private async _removeCommand(message: Message, content: string) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                await message.reply('❌ | Queue is empty!')
                return
            }
            const index = parseInt(content) - 1
            if (index >= guildQueue.songs.length || index < 0) {
                await message.reply(
                    `❌ | invalid position! try '${BotController.instance.config.getPrefix(
                        message.guildId
                    )}q' to display playlist.`
                )
                return
            }
            const song = guildQueue.remove(index)
            await message.reply(`✅ | Removed **${song}**`)
        } catch (e: any) {
            this._logger.warn('There was an error with removeCommand')
            this._logger.error(e)
        }
    }

    private _validCommand(message: Message) {
        if (!message || !message.guild || !message.member) {
            return false
        }

        const djRole = BotController.instance.config.getMusic(message.guildId)?.djRole ?? '*'
        const roleExists = message.member.roles.cache.find((r: Role) => r.name === djRole)
        if (djRole !== '*' && !roleExists) {
            return false
        }

        return true
    }

    public async handleCommands(content: string, message: Message) {
        try {
            if (!this._validCommand(message)) {
                throw new BotError('invalid command occured: missing key properties', {
                    message,
                    guild: message.guild,
                    member: message.member
                })
            }
            const { first, rest } = removeFirstWord(content)
            for (const command of enumKeys(MusicCommands)) {
                const key = MusicCommands[command]
                if (first?.toLowerCase() === key) {
                    if (key === MusicCommands.PLAYING) {
                        this._commands[key](message, rest)
                    } else {
                        this._workQueue.add({
                            id: key,
                            callback: async () => await this._commands[key](message, rest)
                        })
                    }
                    return
                }
            }

            if (!first || isEmpty(first) || isNumber(first)) {
                this._queueCommand(message, first)
            } else {
                await message.reply(
                    `This command is not supported - try '${BotController.instance.config.getPrefix(
                        message.guildId
                    )}queue help'`
                )
            }
        } catch (e: any) {
            this._logger.warn('There was an error with handleCommands')
            this._logger.error(e)

            try {
                await message.reply('Something has gone terribly wrong! 😵‍💫')
            } catch {}
        }
    }
}
