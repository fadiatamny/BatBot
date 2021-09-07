export enum RatingCategories {
    GFUEL = 'gfuel',
    FOOD = 'food'
}

export interface Rating {
    catergory: RatingCategories
    item: string
    rating: number
    raterId: string
    date: Date
}
