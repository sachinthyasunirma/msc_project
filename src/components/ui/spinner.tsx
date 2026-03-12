import { TourLoader } from "@/components/ui/tour-loader"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <TourLoader
      size="sm"
      className={cn("size-4", className)}
      {...props}
    />
  )
}

export { Spinner }
