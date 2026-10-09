import * as React from "react"
import { cn } from "@/lib/utils"

const AvatarContext = React.createContext<{
  imageError: boolean
  setImageError: (val: boolean) => void
}>({
  imageError: false,
  setImageError: () => {},
})

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const [imageError, setImageError] = React.useState(false)

  return (
    <AvatarContext.Provider value={{ imageError, setImageError }}>
      <div
        ref={ref}
        className={cn(
          "relative flex size-6 shrink-0 overflow-hidden rounded-full border border-border/40 bg-secondary/80",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  )
})
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, src, alt = "", onError, ...props }, ref) => {
  const { imageError, setImageError } = React.useContext(AvatarContext)

  if (!src || imageError) return null

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      onError={(e) => {
        setImageError(true)
        onError?.(e)
      }}
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-secondary text-[9px] font-semibold uppercase text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
