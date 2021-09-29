export const enumKeys = <E>(e: E): (keyof E)[] => {
    return Object.keys(e) as (keyof E)[]
}

export const removeFirstWord = (content: string) => {
    const split = content.split(' ')
    const first = split.shift()
    const rest = split.join(' ')

    return { first, rest }
}

export const delay = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const HourInMS = 3.6e6
