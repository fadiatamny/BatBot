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
    PLAYLIST = 'addPlaylist',
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
            [MusicCommands.PLAYLIST]: this._playlistCommand.bind(this),
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
        this._player = new Player(this._bot, {
            leaveOnEmpty: false,
            leaveOnStop: false,
            leaveOnEnd: false,
        })
        this._logger = new Logger('MusicController')

        this._player.on('playlistAdd', (queue: Queue, playlist: Playlist) => {
            // const embedded = new MessageEmbed()
            //     .setColor('#00ff00')
            //     .setTitle(playlist.name)
            //     .setAuthor('Added Playlist')
            //     .setDescription(`**${playlist.songs.length}** songs have been added to the queue.`)

            playlist.songs[0].data.message.reply({ embeds: [{
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
                        value: playlist.songs[0].data.index,
                        inline: true,
                    },
                    {
                        name: 'Enqueued',
                        value: playlist.songs.length,
                        inline: true,
                    },
                ]
            }] })
        })
            .on('songAdd', (queue: Queue, song: Song) => {
                if (this._addedInitialTrack) {
                    return // means its initial track and we dont need to notify we added it to a queue.
                }
                const embedded = this._songEmbedded(queue, song, 'Added to queue', true)
                    // .setColor('#00ff00')

                song.data.message.reply({ embeds: [embedded] })
            })
            .on('songFirst', (queue: Queue, song: Song) => {
                const embedded = this._songEmbedded(queue, song, 'Started Playing')
                    .setColor('#0099ff')

                this._addedInitialTrack = false
                queue.data.channel.send({ embeds: [embedded] })
                //await
            })
            .on('songChanged', (queue: Queue, newSong: Song, oldSong: Song) => {
                const embedded = this._songEmbedded(queue, newSong, 'Now Playing')
                    .setColor('#0099ff')

                queue.data.channel.send({ embeds: [embedded] })
            })
            .on('queueEnd', (queue: Queue) => {
                const embedded = new MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle('Queue Ended')
                    .setDescription('The queue has ended.')
                queue.data.channel.send({ embeds: [embedded] })
            })
            .on('error', (e: any) => {
                this._logger.warn('error occured with the discord-music-player instance')
                this._logger.error(e)
            })
    }

    private _songEmbedded(queue: Queue, song: Song, name: string, queued = false) {
        const embedded = new MessageEmbed()
            .setColor('#00ff00')
            .setTitle(song.name)
            .setURL(song.url)
            .setAuthor(name , song.requestedBy?.avatarURL() ?? undefined, song.url)
            .addFields(
                {name: 'Channel', value: song.author, inline: true},
                {name: 'Song Duration', value: song.duration, inline: true},
            )
            .setThumbnail(song.thumbnail)
        if(queued) {
            embedded.addFields(
                {name: 'Position in queue', value: song.data.index, inline: false},
            )
        }
        return embedded
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

            const index = queue.songs.length
            
            if (!(queue.isPlaying || queue.songs.length)) {
                this._addedInitialTrack = true
            }
            await queue.join(message.member!.voice.channel!)
            message.reply('🎵 Searching 🔎 `'+content+'`')
            if (!isPlaylist) {
                let song = await queue.play(content, {
                    requestedBy: message.member.user,
                    data: {
                        message: message,
                        index: index,
                    }
                }).catch(_ => {
                    if (!guildQueue)
                        queue.stop()
                })
                if (!song) {
                    message.reply(`❌ | your song couldn't be found, if it's a playlist try 'addPlaylist' instead of 'add'`)
                    return
                }
            }
            else {
                let playlist = await queue.playlist(content).catch(_ => {
                    if (!guildQueue)
                        queue.stop();
                })
                if (!playlist) {
                    message.reply(`❌ | your playlist couldn't be found, if it's a song try 'add' instead of 'addPlaylist'`)
                }
                if (!this._addedInitialTrack) {
                    this._addedInitialTrack = true
                }
                playlist!.songs[0].setData({
                    message: message,
                    index: index,
                })
                playlist!.songs[0].requestedBy = message.member.user
                // playlist!.queue.songs.forEach()
                // playlist.requestedBy = message.member.user
                // playlist.setData({
                //     message: message,
                // })
            }
        } catch (e: any) {
            this._logger.error(e)
        }
        //     try {
        //         if (!message.member?.voice.channel) {
        //             message.reply('You need to be in a voice channel to queue music!')
        //             return
        //         }

        //         if (
        //             message.guild!.me &&
        //             message.guild!.me.voice.channel &&
        //             message.member!.voice.channel !== message.guild!.me.voice.channel
        //         ) {
        //             message.reply(`I'm already occupied in another voice channel!`)
        //             return
        //         }

        //         const guild = this._bot.guilds.cache.get(message.guild!.id!)
        //         const voiceChannel = message.member!.voice.channel

        //         const searchResult = await this._player.search(content, {
        //             requestedBy: message.member.nickname!,
        //             searchEngine: QueryType.AUTO
        //         })

        //         if (!searchResult || !searchResult.tracks.length) {
        //             message.reply('No results were found!')
        //             return
        //         }

        //         const musicQueue = await this._player.createQueue(guild!, {
        //             metadata: {
        //                 channel: message.channel
        //             }
        //         })

        //         try {
        //             if (!musicQueue.connection) {
        //                 await musicQueue.connect(voiceChannel)
        //             }
        //         } catch (e: any) {
        //             this._player.deleteQueue(message.guild!.id)
        //             message.reply('Could not join your voice channel!')
        //             this._logger.warn('could not join voiceChannel: ' + voiceChannel)
        //             // this._logger.error(e)
        //             return
        //         }

        //         if (!musicQueue.playing && !this._addedInitialTrack) {
        //             this._addedInitialTrack = true
        //         }

        //         await message.reply(`⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`)
        //         const playlist = await searchResult.playlist
        //         if (playlist) {
        //             musicQueue.addTracks(searchResult.tracks)
        //         } else {
        //             musicQueue.addTrack(searchResult.tracks[0])
        //         }

        //         if (this._addedInitialTrack) {
        //             await musicQueue.play()
        //         }
        //     } catch (e: any) {
        //         this._logger.warn('There was an error with playCommand')
        //         // this._logger.error(e)
        //     }
    }

    private async _playingCommand(message: Message) {
        try {
            const guildQueue = this._player.getQueue(message.guild!.id)
            if (!guildQueue || !guildQueue.isPlaying) {
                message.reply('❌ | No music is being played!')
                return
            }

            const embedded = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Currently Playing')
                .setURL(guildQueue.nowPlaying.url)
                .setAuthor(guildQueue.nowPlaying.name, guildQueue.nowPlaying.thumbnail, guildQueue.nowPlaying.url)
                .setDescription(`Song's length: **${guildQueue.nowPlaying.millisecons}/${guildQueue.nowPlaying.duration}**\n
                                Requested by: **${guildQueue.nowPlaying.requestedBy?.username ?? 'unknown'}**`)
                .setThumbnail(guildQueue.nowPlaying.thumbnail)

            message.reply({ embeds: [embedded] })

            //         const guild = this._bot.guilds.cache.get(message.guild!.id!)
            //         const musicQueue = await this._player.createQueue(guild!, {
            //             metadata: {
            //                 channel: message.channel
            //             }
            //         })

            //         if (musicQueue && musicQueue.playing) {
            //             const track = await musicQueue.nowPlaying()
            //             const time = await musicQueue.getPlayerTimestamp()
            //             message.reply(
            //                 `🎶 | Currently Playing ${track.title}\n⏱ | ${time.current}/${time.end}\n📃 | ${track.url}`
            //             )
            //         } else {
            //             message.reply('❌ | No music is being played!')
            //         }
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
            //         const musicQueue = this._player.getQueue(message.guildId!)
            //         if (!musicQueue || !musicQueue.playing) {
            //             message.reply('❌ | No music is being played!')
            //             return
            //         }
            //         const track = musicQueue.current
            //         message.reply(musicQueue.skip() ? `✅ | Skipped **${track}**!` : '❌ | Something went wrong!')
        } catch (e: any) {
            this._logger.warn('There was an error with skipCommand')
            // this._logger.error(e)
        }
    }

    private async _stopCommand(message: Message) {
        try {
            //         const musicQueue = this._player.getQueue(message.guildId!)
            //         if (!musicQueue || !musicQueue.playing) {
            //             message.reply('❌ | No music is being played!')
            //             return
            //         }
            //         musicQueue.destroy()
            //         message.reply('🛑 | bye-bye!')
        } catch (e: any) {
            this._logger.warn('There was an error with stopCommand')
            // this._logger.error(e)
        }
    }

    private async _queueCommand(message: Message) {
        try {
            //         const musicQueue = this._player.getQueue(message.guildId!)
            //         if (!musicQueue || !musicQueue.tracks || !musicQueue.tracks.length) {
            //             message.reply('❌ | queue is empty!')
            //             return
            //         }

            //         const currentTrack = musicQueue.current
            //         const tracks = musicQueue.tracks.map((track: Track, index: number) => {
            //             return `${index + 1}. **${track.title}** - ${track.duration} [${track.url}]`
            //         })

            //         const embed = new MessageEmbed()
            //         embed.title = 'Music Queue'
            //         embed.description = `${tracks.join('\n')}`
            //         embed.fields = [
            //             {
            //                 name: 'Now Playing',
            //                 value: `🎶 | Now playing **${currentTrack.title}** - ${currentTrack.duration} [${currentTrack.url}]`,
            //                 inline: false
            //             }
            //         ]

            //         message.reply({ embeds: [embed] })
        } catch (e: any) {
            this._logger.warn('There was an error with queue')
            // this._logger.error(e)
        }
    }

    private async _removeCommand(message: Message, content: string) {
        try {
            //         const musicQueue = this._player.getQueue(message.guildId!)
            //         if (!musicQueue || !musicQueue.tracks || !musicQueue.tracks.length) {
            //             message.reply('❌ | queue is empty!')
            //             return
            //         }

            //         const index = parseInt(content.split(' ')[0]) - 1
            //         if (index >= musicQueue.tracks.length) {
            //             message.reply('❌ | no such index number exists! use `!queue` to display current queue')
            //             return
            //         }
            //         message.reply(`✅ | Removed **${musicQueue.tracks[index].title}**`)
            //         musicQueue.remove(index)
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
                this._queueCommand(message)
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
