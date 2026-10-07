import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef<any, any>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative w-full h-full min-h-[200px]", className)}
      {...props}
    >
      {children}
    </div>
  )
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = RechartsPrimitive.Tooltip
const ChartTooltipContent = ({ className, ...props }: any) => (
  <div className={cn("rounded-lg border bg-popover p-3 shadow-sm", className)} {...props} />
)

const ChartLegend = RechartsPrimitive.Legend
const ChartLegendContent = ({ className, ...props }: any) => (
  <div className={cn("flex items-center justify-center gap-4", className)} {...props} />
)

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent }