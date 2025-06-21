import type { INGREDIENT_STATUS } from '@/modules/ingredients/shared/constants'

export type IngredientStatus = (typeof INGREDIENT_STATUS)[keyof typeof INGREDIENT_STATUS]

export interface IngredientProps {
  id: string
  name: string
  quantity?: number
  unit?: string
  expirationDate?: Date
  category?: string
  status: IngredientStatus
  createdAt: Date
  updatedAt: Date
}

export class IngredientEntity {
  private props: IngredientProps

  constructor(props: IngredientProps) {
    this.props = { ...props }
  }

  get id(): string {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get quantity(): number | undefined {
    return this.props.quantity
  }

  get unit(): string | undefined {
    return this.props.unit
  }

  get expirationDate(): Date | undefined {
    return this.props.expirationDate
  }

  get category(): string | undefined {
    return this.props.category
  }

  get status(): IngredientStatus {
    return this.props.status
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  isExpired(): boolean {
    if (!this.props.expirationDate) {
      return false
    }
    return this.props.expirationDate < new Date()
  }

  isExpiringSoon(withinDays: number): boolean {
    if (!this.props.expirationDate) {
      return false
    }

    const today = new Date()
    const expirationThreshold = new Date()
    expirationThreshold.setDate(today.getDate() + withinDays)

    return this.props.expirationDate <= expirationThreshold
  }

  updateStatus(newStatus: IngredientStatus): void {
    this.props.status = newStatus
    this.props.updatedAt = new Date()
  }

  toObject(): IngredientProps {
    return { ...this.props }
  }

  /**
   * Calculate status based on quantity
   * This centralizes the business logic for status determination
   */
  calculateStatus(): IngredientStatus {
    if (this.props.quantity === undefined || this.props.quantity === null) {
      return 'AVAILABLE' as IngredientStatus
    }

    if (this.props.quantity === 0) {
      return 'OUT' as IngredientStatus
    }

    if (this.props.quantity < 5) {
      return 'LOW' as IngredientStatus
    }

    return 'AVAILABLE' as IngredientStatus
  }

  /**
   * Update status based on current quantity
   */
  updateStatusBasedOnQuantity(): void {
    this.props.status = this.calculateStatus()
  }

  /**
   * Create a new ingredient with calculated status
   */
  static create(props: Omit<IngredientProps, 'status'>): IngredientEntity {
    const ingredient = new IngredientEntity({
      ...props,
      status: 'AVAILABLE' as IngredientStatus, // temporary status
    })
    ingredient.updateStatusBasedOnQuantity()
    return ingredient
  }
}
