import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  change?: {
    value: number
    type: "increase" | "decrease"
  }
  className?: string
}

export function StatsCard({ title, value, description, change, className }: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {change && (
          <p className={`text-xs mt-1 ${change.type === "increase" ? "text-green-600" : "text-red-600"}`}>
            {change.type === "increase" ? "+" : "-"}
            {change.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  )
}
