import { Client, Guild, Message } from 'discord.js'
import { Logger } from '../utils/Logger'
import { enumKeys } from '../utils'
import { Player, Track } from 'discord-player'
import { QueryType } from 'discord-player'

enum MusicCommands {
    PLAY = 'add',
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

    constructor(private _bot: Client) {
        this._commands = {
            [MusicCommands.PLAY]: this._playCommand.bind(this),
            [MusicCommands.SKIP]: this._skipCommand.bind(this),
            [MusicCommands.DISCONNECT]: this._stopCommand.bind(this),
            [MusicCommands.DC]: this._stopCommand.bind(this),
            [MusicCommands.STOP]: this._stopCommand.bind(this),
            [MusicCommands.CLEAR]: this._stopCommand.bind(this),
            [MusicCommands.REMOVE]: this._removeCommand.bind(this)
        }
        console.log(_bot)
        this._player = new Player(this._bot)
        this._logger = new Logger('MusicController')
        this._player.on('trackStart', (queue: any, track: Track) =>
            queue.metadata.channel.send(`🎶 | Now playing **${track.title}** - ${track.duration} \n[${track.url}]`)
        )
        this._player.on('trackAdd', (queue: any, track: Track) =>
            queue.metadata.channel.send(`⏱ | **${track.title}** queued at index #${queue.tracks.length}`)
        )
    }

    private async _playCommand(content: string, message: Message) {
        try {
            this._logger.log('_playCommand')
            if (!message.member?.voice.channel)
                return message.reply('You need to be in a voice channel to queue music!')

            if (
                message.guild!.me &&
                message.guild!.me.voice.channel &&
                message.member!.voice.channel !== message.guild!.me.voice.channel
            ) {
                return message.reply(`I'm already occupied in another voice channel!`)
            }

            const guild = this._bot.guilds.cache.get(message.guildId!)
            const voiceChannel = message.member!.voice.channel

            const searchResult = await this._player.search(content, {
                requestedBy: message.member.nickname!,
                searchEngine: QueryType.AUTO
            })

            if (!searchResult || !searchResult.tracks.length) return message.reply('No results were found!')

            const musicQueue = await this._player.createQueue(guild!, {
                metadata: {
                    channel: message.channel
                }
            })

            try {
                if (!musicQueue.connection) await musicQueue.connect(voiceChannel)
            } catch {
                this._player.deleteQueue(message.guild!.id)
                message.reply('Could not join your voice channel!')
                return void this._logger.error('could not join voiceChannel: ' + voiceChannel)
            }

            this._logger.log('addTracks')
            await message.reply(`⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`)
            ;(await searchResult.playlist)
                ? musicQueue.addTracks(searchResult.tracks)
                : musicQueue.addTrack(searchResult.tracks[0])

            this._logger.log('play')
            if (!musicQueue.playing) await musicQueue.play()
        } catch (e: any) {
            this._logger.log('There was an error with _playCommand')
            this._logger.error(e)
        }
    }

    private async _skipCommand(content: string, message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.playing) return void message.reply('❌ | No music is being played!')
            const track = musicQueue.current
            return void message.reply(musicQueue.skip() ? `✅ | Skipped **${track}**!` : '❌ | Something went wrong!')
        } catch (e: any) {
            this._logger.log('There was an error with _skipCommand')
            this._logger.error(e)
        }
    }

    private async _stopCommand(content: string, message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.playing) return void message.reply('❌ | No music is being played!')
            musicQueue.destroy()
            return void message.reply('🛑 | bye-bye!')
        } catch (e: any) {
            this._logger.log('There was an error with _stopCommand')
            this._logger.error(e)
        }
    }

    private async _queue(content: string, message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)

            if (!musicQueue || !musicQueue.tracks || !musicQueue.tracks.length)
                return void message.reply('❌ | queue is empty!')

            const currentTrack = musicQueue.current
            const tracks = musicQueue.tracks.map((track: Track, index: number) => {
                return `${index + 1}. **${track.title}** - ${track.duration} [${track.url}]`
            })

            return void message.reply({
                embeds: [
                    {
                        title: 'Music Queue',
                        description: `${tracks.join('\n')}`,
                        color: 0x00ff00,
                        fields: [
                            {
                                name: 'Now Playing',
                                value: `🎶 | Now playing **${currentTrack.title}** - ${currentTrack.duration} [${currentTrack.url}]`
                            }
                        ]
                    }
                ]
            })
        } catch (e: any) {
            this._logger.log('There was an error with _queue')
            this._logger.error(e)
        }
    }

    private async _removeCommand(content: string, message: Message) {
        try {
            const musicQueue = this._player.getQueue(message.guildId!)
            if (!musicQueue || !musicQueue.tracks || !musicQueue.tracks.length)
                return void message.reply('❌ | queue is empty!')

            const index = parseInt(content.split(' ')[0]) - 1
            if (index >= musicQueue.tracks.length)
                return void message.reply('❌ | no such index number exists! use `!queue` to display current queue')
            message.reply(`✅ | Removed **${musicQueue.tracks[index].title}**`)
            musicQueue.remove(index)
        } catch (e: any) {
            this._logger.log('There was an error with _removeCommand')
            this._logger.error(e)
        }
    }

    public handleCommands(content: string, message: Message) {
        try {
            this._logger.log('handleCommand')
            if (!message || !message.guild || !message.member) {
                return
            }
            if (!content || !content.length) return void this._queue(content, message)
            for (const command of enumKeys(MusicCommands)) {
                const key = MusicCommands[command]
                if (content.startsWith(key)) {
                    content = content.substr(content.indexOf(' ') + 1)
                    return void this._commands[key](content, message)
                }
            }
        } catch (e: any) {
            message.reply('Something has gone terribly wrong! 😵‍💫')
            this._logger.log('There was an error with handleCommands')
            this._logger.error(e)
        }
    }
}
