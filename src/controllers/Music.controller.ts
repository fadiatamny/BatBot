import { Client, Message, MessageEmbed, Options, Role } from 'discord.js'
import { Logger } from '../utils/Logger'
import { WorkQueue } from '../utils/WorkQueue'
import { enumKeys, removeFirstWord } from '../utils'
// import { Player, Queue, Track } from 'discord-player'
// import { QueryType } from 'discord-player'
import { BotError } from '../models/BotError.model'
import BotController from './Bot.controller'
import { Player, Playlist, Queue, Song } from 'discord-music-player'

enum MusicCommands {
    HELP = 'help',
    PLAY = 'add',
    PLAYLIST = 'playlist',
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
        }
        this._addedInitialTrack = true

        this._workQueue = new WorkQueue()
        this._player = new Player(this._bot, {
            leaveOnEmpty: false,
            leaveOnStop: false,
            leaveOnEnd: false,
            timeout: 1,
        })
        this._logger = new Logger('MusicController')

        this._player.on('playlistAdd', (queue: Queue, playlist: Playlist) => {
            try {
                playlist.songs[0].data.message.reply({
                    embeds: [{
                        color: '#00ff00',
                        title: playlist.toString(),
                        author: {
                            name: 'Playlist added to queue',
                            icon_url: playlist.songs[0].data.message.member.user.avatarURL(),
                            url: playlist.url,
                        },
                        fields: [
                            {
                                name: 'Position in queue',
                                value: playlist.songs[0].data.index.toString() ?? '?',
                                inline: true,
                            },
                            {
                                name: 'Enqueued',
                                value: playlist.songs.length,
                                inline: true,
                            },
                        ]
                    }]
                })
            } catch (e: any) {
                this._logger.error(e)
            }
        }).on('songAdd', (queue: Queue, song: Song) => {
            if (this._addedInitialTrack) {
                this._addedInitialTrack = false
                return // means its initial track and we dont need to notify we added it to a queue.
            }

            const embedded = this._songEmbedded(queue, song, 'Added to queue', true)
            song.data.message.reply({ embeds: [embedded] })
        }).on('songFirst', (queue: Queue, song: Song) => {
            const embedded = this._songEmbedded(queue, song, 'Started Playing')
                .setColor('#0099ff')

            this._addedInitialTrack = false
            queue.data.channel.send({ embeds: [embedded] })
            //await
        }).on('songChanged', (queue: Queue, newSong: Song, oldSong: Song) => {
            const embedded = this._songEmbedded(queue, newSong, 'Now Playing')
                .setColor('#0099ff')

            queue.data.channel.send({ embeds: [embedded] })
        }).on('queueEnd', async (queue: Queue) => {
            const embedded = new MessageEmbed()
                .setColor('#ff0000')
                .setTitle('Queue is over')
                .setDescription('The queue has ended.')
            this._addedInitialTrack = true
            await queue.data.channel.send({ embeds: [embedded] })
        }).on('error', (e: any) => {
            this._logger.warn('error occured with the discord-music-player instance')
            this._logger.error(e)
        })
    }

    private _songEmbedded(queue: Queue, song: Song, name: string, queued = false) {
        const embedded = new MessageEmbed()
        try {
            embedded.setColor('#00ff00')
                .setTitle(song.name)
                .setURL(song.url)
                .setAuthor(name, song.requestedBy?.avatarURL() ?? undefined, song.url)
                .addFields(
                    { name: 'Channel', value: song.author, inline: true },
                    { name: 'Song Duration', value: song.duration, inline: true },
                    { name: 'Requested by', value: song.requestedBy?.username ?? 'unkown', inline: true },
                )
                .setThumbnail(song.thumbnail)
            if (queued) {
                embedded.addFields(
                    { name: 'Position in queue', value: song.data.index.toString() ?? '?', inline: false },
                )
            }
        } catch (e: any) {
            this._logger.error(e)
        }
        return embedded
    }

    private async _helpCommand(message: Message) {
        const embedded = {
            color: 0xFFFF00,
            title: 'Music Commands',
            description: `Prefix: '**${process.env.BOT_PREFIX}queue**' or '**${process.env.BOT_PREFIX}q**' for short`,
            fields: [
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: false,
                },
                {
                    name: 'Queue song',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.PLAY} <song>`,
                    inline: true,
                },
                {
                    name: 'Queue playlist',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.PLAYLIST} <playlist>`,
                    inline: true,
                },
                {
                    name: 'Display current song',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.PLAYING}`,
                    inline: true,
                },
                {
                    name: 'Skip song',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.SKIP}`,
                    inline: true,
                },
                {
                    name: 'Dequeue song',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.REMOVE} <position>`,
                    inline: true,
                },
                {
                    name: 'Shuffle queue',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.SHUFFLE}`,
                    inline: true,
                },
                {
                    name: 'Pause music',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.PAUSE}`,
                    inline: true,
                },
                {
                    name: 'Resume music',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.RESUME}`,
                    inline: true,
                },
                {
                    name: 'Stop & clear queue',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.STOP}`,
                    inline: true,
                },
                {
                    name: 'Clear queue',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.CLEAR}`,
                    inline: true,
                },
                {
                    name: 'Disconnect bot',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.DISCONNECT}/${MusicCommands.DC}`,
                    inline: true,
                },
                {
                    name: 'Show available commands',
                    value: `${process.env.BOT_PREFIX}q ${MusicCommands.HELP}`,
                    inline: true,
                },
            ],
        }
        message.reply({ embeds: [embedded] })
    }

    private async _playlistCommand(message: Message, content: string) {
        this._playCommand(message, content, true)
    }

    private async _playCommand(message: Message, content: string, isPlaylist = false) {
        try {
            if (!message.member?.voice.channel) {
                message.reply('You need to be in a voice channel to queue music!')
                return
            }
            if (
                message.guild!.me &&
                message.guild!.me.voice.channel &&
                message.member!.voice.channel !== message.guild!.me.voice.channel
            ) {
                message.reply(`I'm already occupied in another voice channel!`)
                return
            }

            const guildQueue = this._player.getQueue(message.guild!.id)

            let queue = this._player.createQueue(message.guild!.id,
                {
                    data: {
                        channel: message.channel,
                    }
                })

            const index = queue.songs.length ?? 0

            // if (queue && !queue.isPlaying && (!queue.songs || !queue.songs.length)) {
            //     this._addedInitialTrack = true
            // }
            await queue.join(message.member!.voice.channel!)
            message.reply('🎵 Searching 🔎 `' + content + '`')
            if (!isPlaylist) {
                let song = await queue.play(content, {
                    requestedBy: message.member.user,
                    data: {
                        message: message,
                        index: index,
                    }
                }).catch(_ => {
                    this._logger.warn(`queue.play catch`)
                    if (!guildQueue)
                        queue.stop()
                })
                if (!song) {
                    message.reply(`❌ | your song couldn't be found, if it's a playlist try '**${MusicCommands.PLAYLIST}**' instead of '**${MusicCommands.PLAY}**'`)
                    return
                }
            }
            else {
                let playlist = await queue.playlist(content, {
                    requestedBy: message.member.user,
                    data: {
                        message: message,
                        index: index,
                    },
                }).catch(_ => {
                    this._logger.warn(`queue.playlist catch`)
                    if (!guildQueue)
                        queue.stop();
                })
                if (!playlist) {
                    message.reply(`❌ | your playlist couldn't be found, if it's a song try '**${MusicCommands.PLAY}**' instead of '**${MusicCommands.PLAYLIST}**'`)
                }
            }
        } catch (e: any) {
            this._logger.warn('There was an error with playCommand')
            // this._logger.error(e)
        }
    }

    private async _playingCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                message.reply('❌ | No music is being played!')
                return
            }
            const embedded = this._songEmbedded(guildQueue, guildQueue.nowPlaying, 'Currently Playing', false)
                .setColor('#0099ff')
            message.reply({ embeds: [embedded] })
        } catch (e: any) {
            this._logger.warn('There was an error with playCommand')
            // this._logger.error(e)
        }
    }

    private async _skipCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                message.reply('❌ | No music is being played!')
                return
            }
            let song = guildQueue?.skip()
            message.reply(song ? `✅ | Skipped **${song}**!` : '❌ | Something went wrong!')
        } catch (e: any) {
            this._logger.warn('There was an error with skipCommand')
            // this._logger.error(e)
        }
    }

    private async _pauseCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                message.reply('❌ | No music is being played!')
                return
            }
            guildQueue.setPaused(true)
            message.reply({
                embeds: [{
                    color: '#FFA500',
                    title: 'Paused',
                    description: `Music has been paused.`,
                }]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with pauseCommand')
            // this._logger.error(e)
        }
    }

    private async _resumeCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                message.reply('❌ | No music is being played!')
                return
            }
            guildQueue.setPaused(false)
            message.reply({
                embeds: [{
                    color: '#00FF00',
                    title: 'Paused',
                    description: `Music has been resumed.`,
                }]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with resumeCommand')
            // this._logger.error(e)
        }
    }

    private async _shuffleCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                message.reply('❌ | Queue is empty!')
                return
            }
            guildQueue.shuffle()
        } catch (e: any) {
            this._logger.warn('There was an error with shuffleCommand')
            // this._logger.error(e)
        }
    }

    private async _clearCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                message.reply('❌ | Queue is empty!')
                return
            }
            guildQueue.clearQueue()
        } catch (e: any) {
            this._logger.warn('There was an error with clearCommand')
            // this._logger.error(e)
        }
    }

    private async _stopCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying && (!guildQueue.songs || !guildQueue.songs.length)) {
                message.reply('❌ | No music to stop and no queue to clear!')
                return
            }
            this._addedInitialTrack = true
            guildQueue.stop()
            message.reply({
                embeds: [{
                    color: '#ff0000',
                    title: 'Stopped',
                    description: `Music has stopped.\nQueue has been cleared.`,
                }]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with stopCommand')
            // this._logger.error(e)
        }
    }

    private async _disconnectCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.connection || !guildQueue.connection.channel) {
                message.reply(`❌ | I'm not connected to a voice channel!`)
                return
            }
            this._addedInitialTrack = true
            guildQueue.stop()
            guildQueue.connection.leave()
            message.reply({
                embeds: [{
                    color: '#ff0000',
                    title: 'Disconnected',
                    description: `I've been disconnected.`,
                }]
            })
        } catch (e: any) {
            this._logger.warn('There was an error with stopCommand')
            // this._logger.error(e)
        }
    }

    private async _queueCommand(message: Message, content: string) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                message.reply('❌ | Queue is empty!')
                return
            }
            let index = 1
            if (content && content.length) {
                index = parseInt(content)
                if (index === NaN) {
                    index = 1
                }
            }
            const start = 10 * (index - 1)
            const end = start + 10
            const nowPlaying = guildQueue.nowPlaying
            const queueLength = guildQueue.songs.length
            let queueDuration = 0
            for (let i = 0; i < queueLength; i++) {
                queueDuration += guildQueue.songs[i].millisecons

            }
            queueDuration = Math.floor(queueDuration / 1000)
            const hours = Math.floor(queueDuration / 3600)
            const minutes = Math.floor((queueDuration - (hours * 3600)) / 60)
            const seconds = queueDuration - (hours * 3600) - (minutes * 60)
            const songs = guildQueue.songs.slice(start, end).map((song, i) => {
                return `${i + start + 1}. **${song}** - ${song.duration}\n[${song.url}]`
            })

            const embedded = {
                color: 0x00ff00,
                title: 'Music Queue',
                description: `${songs.join('\n')}
                    \nSongs: ${queueLength} \t Page: ${index}/${Math.ceil(queueLength / 10)}`,
                fields: [
                    {
                        name: 'Total Songs',
                        value: queueLength.toString(),
                        inline: true,
                    },
                    {
                        name: 'Pages',
                        value: `${index}/${Math.ceil(queueLength / 10)}`,
                        inline: true,
                    },
                    {
                        name: 'Estimated Duration',
                        value: (hours ? `${hours.toLocaleString('en-US',
                            { minimumIntegerDigits: 2, useGrouping: false })}:`
                            : '') + `${minutes.toLocaleString('en-US',
                                { minimumIntegerDigits: 2, useGrouping: false })}:${seconds.toLocaleString('en-US',
                                    { minimumIntegerDigits: 2, useGrouping: false })}`,
                        inline: true,
                    },
                    {
                        name: 'Now Playing',
                        value: `🎶 | **${nowPlaying}** - ${nowPlaying.duration}\n📃 | [${nowPlaying.url}]`,
                        inline: false,
                    }
                ],
            }

            message.reply({ embeds: [embedded] })
        } catch (e: any) {
            this._logger.warn('There was an error with queue')
            // this._logger.error(e)
        }
    }

    private async _removeCommand(message: Message, content: string) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.songs || !guildQueue.songs.length) {
                message.reply('❌ | Queue is empty!')
                return
            }
            const index = parseInt(content) - 1
            if (index >= guildQueue.songs.length) {
                message.reply(`❌ | invalid position! try '${process.env.BOT_TOKEN}q' to display playlist.`)
                return
            }
            const song = guildQueue.remove(index)
            message.reply(`✅ | Removed **${song}**`)
        } catch (e: any) {
            this._logger.warn('There was an error with removeCommand')
            // this._logger.error(e)
        }
    }

    private _validCommand(message: Message) {
        if (!message || !message.guild || !message.member) {
            return false
        }

        const djRole = BotController.instance.config.music.djRole
        const roleExists = message.member.roles.cache.find((r: Role) => r.name === djRole)
        if (djRole !== '*' && !roleExists) {
            return false
        }

        return true
    }

    public handleCommands(content: string, message: Message) {
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

            if (!first || first === '') {
                this._queueCommand(message, rest)
            } else {
                message.reply(`This command is not supported - try '${process.env.PREFIX}queue help'`)
            }
        } catch (e: any) {
            message.reply('Something has gone terribly wrong! 😵‍💫')
            this._logger.warn('There was an error with handleCommands')
            // this._logger.error(e)
        }
    }
}
