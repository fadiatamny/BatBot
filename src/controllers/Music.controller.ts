import { Client, Message, MessageEmbed, Role } from 'discord.js'
import { Logger } from '../utils/Logger'
import { WorkQueue } from '../utils/WorkQueue'
import { enumKeys, removeFirstWord } from '../utils'
import { Player, Queue, Track } from 'discord-player'
import { QueryType } from 'discord-player'
import { BotError } from '../models/BotError.model'
import BotController from './Bot.controller'

enum MusicCommands {
    PLAY = 'add',
    PLAYING = 'playing',
    SKIP = 'skip',
    STOP = 'stop',
    DISCONNECT = 'disconnect',
    DC = 'dc',
    CLEAR = 'clear',
    REMOVE = 'remove'
}

export default class MusicController {
    private _commands: { [key: string]: (...args: any[]) => void }
    private _logger: Logger
    private _player: Player
    private _workQueue: WorkQueue
    private _addedInitialTrack: boolean

    constructor(private _bot: Client) {
        this._commands = {
            [MusicCommands.PLAY]: this._playCommand.bind(this),
            [MusicCommands.PLAYING]: this._playingCommand.bind(this),
            [MusicCommands.SKIP]: this._skipCommand.bind(this),
            [MusicCommands.DISCONNECT]: this._stopCommand.bind(this),
            [MusicCommands.DC]: this._stopCommand.bind(this),
            [MusicCommands.STOP]: this._stopCommand.bind(this),
            [MusicCommands.CLEAR]: this._stopCommand.bind(this),
            [MusicCommands.REMOVE]: this._removeCommand.bind(this)
        }
        this._addedInitialTrack = false

        this._workQueue = new WorkQueue()
        this._player = new Player(this._bot)
        this._logger = new Logger('MusicController')
        this._player.on('trackStart', (queue: Queue<any>, track: Track) => {
            this._addedInitialTrack = false
            queue.metadata?.channel.send(
                `🎶 | Now playing **${track.title}** - ${track.duration} \n📃 | [${track.url}]`
            )
            BotController.instance.setPresence([
                {
                    name: `🎶 | Now playing **${track.title}** - ${track.duration}`,
                    url: track.url,
                    type: 'PLAYING'
                }
            ])
        })
        this._player.on('trackAdd', (queue: Queue<any>, track: Track) =>
            queue.metadata.channel.send(`⏱ | **${track.title}** queued at index #${queue.tracks.length}`)
        )
    }

    private async _playCommand(message: Message, content: string) {
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

            const guild = this._bot.guilds.cache.get(message.guild!.id!)
            const voiceChannel = message.member!.voice.channel

            const searchResult = await this._player.search(content, {
                requestedBy: message.member.nickname!,
                searchEngine: QueryType.AUTO
            })

            if (!searchResult || !searchResult.tracks.length) {
                message.reply('No results were found!')
                return
            }

            const musicQueue = await this._player.createQueue(guild!, {
                metadata: {
                    channel: message.channel
                }
            })

            try {
                if (!musicQueue.connection) {
                    await musicQueue.connect(voiceChannel)
                }
            } catch (e: any) {
                this._player.deleteQueue(message.guild!.id)
                message.reply('Could not join your voice channel!')
                this._logger.log('could not join voiceChannel: ' + voiceChannel)
                this._logger.error(e)
                return
            }

            await message.reply(`⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`)
            const playlist = await searchResult.playlist
            if (playlist) {
                musicQueue.addTracks(searchResult.tracks)
            } else {
                musicQueue.addTrack(searchResult.tracks[0])
            }

            if (!musicQueue.playing && !this._addedInitialTrack) {
                this._addedInitialTrack = true
                await musicQueue.play()
            }
        } catch (e: any) {
            this._logger.log('There was an error with playCommand')
            this._logger.error(e)
        }
    }

    private async _playingCommand(message: Message) {
        try {
            const guild = this._bot.guilds.cache.get(message.guild!.id!)
            const musicQueue = await this._player.createQueue(guild!, {
                metadata: {
                    channel: message.channel
                }
            })

            if (musicQueue && musicQueue.playing) {
                const track = await musicQueue.nowPlaying()
                const time = await musicQueue.getPlayerTimestamp()
                message.reply(
                    `🎶 | Currently Playing ${track.title}\n⏱ | ${time.current}/${time.end}\n📃 | ${track.url}`
                )
            } else {
                message.reply('❌ | No music is being played!')
            }
        } catch (e: any) {
            this._logger.log('There was an error with playCommand')
            this._logger.error(e)
        }
    }

    private async _skipCommand(message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.playing) {
                message.reply('❌ | No music is being played!')
                return
            }
            const track = musicQueue.current
            message.reply(musicQueue.skip() ? `✅ | Skipped **${track}**!` : '❌ | Something went wrong!')
        } catch (e: any) {
            this._logger.log('There was an error with skipCommand')
            this._logger.error(e)
        }
    }

    private async _stopCommand(message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.playing) {
                message.reply('❌ | No music is being played!')
                return
            }
            musicQueue.destroy()
            message.reply('🛑 | bye-bye!')
        } catch (e: any) {
            this._logger.log('There was an error with stopCommand')
            this._logger.error(e)
        }
    }

    private async _queue(message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.tracks || !musicQueue.tracks.length) {
                message.reply('❌ | queue is empty!')
                return
            }

            const currentTrack = musicQueue.current
            const tracks = musicQueue.tracks.map((track: Track, index: number) => {
                return `${index + 1}. **${track.title}** - ${track.duration} [${track.url}]`
            })

            const embed = new MessageEmbed()
            embed.title = 'Music Queue'
            embed.description = `${tracks.join('\n')}`
            embed.fields = [
                {
                    name: 'Now Playing',
                    value: `🎶 | Now playing **${currentTrack.title}** - ${currentTrack.duration} [${currentTrack.url}]`,
                    inline: false
                }
            ]

            message.reply({ embeds: [embed] })
        } catch (e: any) {
            this._logger.log('There was an error with queue')
            this._logger.error(e)
        }
    }

    private async _removeCommand(message: Message, content: string) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.tracks || !musicQueue.tracks.length) {
                message.reply('❌ | queue is empty!')
                return
            }

            const index = parseInt(content.split(' ')[0]) - 1
            if (index >= musicQueue.tracks.length) {
                message.reply('❌ | no such index number exists! use `!queue` to display current queue')
                return
            }
            message.reply(`✅ | Removed **${musicQueue.tracks[index].title}**`)
            musicQueue.remove(index)
        } catch (e: any) {
            this._logger.log('There was an error with removeCommand')
            this._logger.error(e)
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
                if (first === key) {
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

            if (!rest || rest === '') {
                this._queue(message)
            } else {
                message.reply('This command is not supported')
            }
        } catch (e: any) {
            message.reply('Something has gone terribly wrong! 😵‍💫')
            this._logger.log('There was an error with handleCommands')
            this._logger.error(e)
        }
    }
}
