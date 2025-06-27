'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/modules/shared/client/components/ui/button'
import { Calendar } from '@/modules/shared/client/components/ui/calendar'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/modules/shared/client/components/ui/form'
import { Input } from '@/modules/shared/client/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/modules/shared/client/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shared/client/components/ui/select'
import { Textarea } from '@/modules/shared/client/components/ui/textarea'
import { useToast } from '@/modules/shared/client/hooks/use-toast'
import { cn } from '@/modules/shared/client/utils'

import { useCategories, useCreateIngredient, useUnits } from '../hooks/use-ingredients-api'

// フォームのバリデーションスキーマ
const formSchema = z.object({
  name: z.string().min(1, '食材名は必須です').max(50, '食材名は50文字以内で入力してください'),
  categoryId: z.string().min(1, 'カテゴリーを選択してください'),
  quantity: z.object({
    amount: z.coerce
      .number()
      .positive('数量は0より大きい値を入力してください')
      .max(9999.99, '数量は9999.99以下で入力してください'),
    unitId: z.string().min(1, '単位を選択してください'),
  }),
  storageLocation: z.object({
    type: z.enum(['REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE'], {
      required_error: '保管場所を選択してください',
    }),
    detail: z.string().max(100, '詳細は100文字以内で入力してください').optional(),
  }),
  threshold: z.coerce
    .number()
    .positive('閾値は0より大きい値を入力してください')
    .max(9999.99, '閾値は9999.99以下で入力してください')
    .optional(),
  expiryInfo: z
    .object({
      bestBeforeDate: z.string().optional(),
      useByDate: z.string().optional(),
    })
    .optional(),
  purchaseDate: z.string().min(1, '購入日は必須です'),
  price: z.coerce
    .number()
    .positive('価格は0より大きい値を入力してください')
    .max(999999, '価格は999999以下で入力してください')
    .optional(),
  memo: z.string().max(500, 'メモは500文字以内で入力してください').optional(),
})

type FormData = z.infer<typeof formSchema>

interface CreateIngredientFormProps {
  onSuccess?: () => void
}

export function CreateIngredientForm({ onSuccess }: CreateIngredientFormProps = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // APIフックの使用
  const { data: categories, isLoading: isLoadingCategories } = useCategories()
  const { data: units, isLoading: isLoadingUnits } = useUnits()
  const createIngredientMutation = useCreateIngredient()

  // フォームの初期化
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      quantity: {
        amount: 1,
        unitId: '',
      },
      storageLocation: {
        type: 'REFRIGERATED',
        detail: '',
      },
      purchaseDate: new Date().toISOString().split('T')[0],
      memo: '',
    },
  })

  // フォーム送信処理
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await createIngredientMutation.mutateAsync(data)
      toast({
        title: '食材を登録しました',
        description: `${data.name}を登録しました`,
      })
      form.reset()

      // 成功時のコールバックを実行
      if (onSuccess) {
        onSuccess()
      }
      router.refresh()
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '食材の登録に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 日付フォーマット関数
  const formatDate = (date: Date | undefined) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
        {/* 食材名 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>食材名 *</FormLabel>
              <FormControl>
                <Input placeholder="例: トマト" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* カテゴリー */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリー *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリーを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingCategories ? (
                    <SelectItem value="loading" disabled>
                      読み込み中...
                    </SelectItem>
                  ) : (
                    categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 数量と単位 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity.amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>数量 *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="例: 3" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity.unitId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>単位 *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="単位を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingUnits ? (
                      <SelectItem value="loading" disabled>
                        読み込み中...
                      </SelectItem>
                    ) : (
                      units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 保管場所 */}
        <FormField
          control={form.control}
          name="storageLocation.type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>保管場所 *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="REFRIGERATED">冷蔵</SelectItem>
                  <SelectItem value="FROZEN">冷凍</SelectItem>
                  <SelectItem value="ROOM_TEMPERATURE">常温</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storageLocation.detail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>保管場所詳細</FormLabel>
              <FormControl>
                <Input placeholder="例: 野菜室" {...field} />
              </FormControl>
              <FormDescription>具体的な保管場所を入力できます</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 購入日 */}
        <FormField
          control={form.control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>購入日 *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value || <span>日付を選択</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(formatDate(date))}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 賞味期限・消費期限 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="expiryInfo.bestBeforeDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>賞味期限</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value || <span>日付を選択</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(formatDate(date))}
                      disabled={(date) => date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryInfo.useByDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>消費期限</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value || <span>日付を選択</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(formatDate(date))}
                      disabled={(date) => date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 価格と閾値 */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>価格</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="例: 300" {...field} />
                </FormControl>
                <FormDescription>円単位で入力</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>在庫閾値</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="例: 2" {...field} />
                </FormControl>
                <FormDescription>この数量以下で通知</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* メモ */}
        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メモ</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="食材に関するメモを入力できます"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 送信ボタン */}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? '登録中...' : '食材を登録'}
        </Button>
      </form>
    </Form>
  )
}
