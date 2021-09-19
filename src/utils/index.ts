export const enumKeys = <E>(e: E): (keyof E)[] => {
    return Object.keys(e) as (keyof E)[]
}

export const removePrefix = (content: string, length?: number) => {
    content = content.slice(length ?? 0)
    if (content[0] === ' ') {
        content = content.slice(1)
    }
    return content
}
