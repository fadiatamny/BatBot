export enum RatingCategories {
    GFUEL = 'gfuel',
    FOOD = 'food'
}

export interface Rating {
    category: RatingCategories
    item: string
    rating: number
    raterId: string
}

export interface DbRating extends Rating {
    id: number
    date: Date
}

export interface RatingQuery {
    date?: Date
    category?: RatingCategories
    item?: string
    rating?: number
    raterId?: string
}
