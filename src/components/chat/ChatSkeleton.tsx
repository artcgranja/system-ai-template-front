import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChatSkeleton() {
  return (
    <div className="w-full max-w-3xl px-4 sm:px-6 py-4 space-y-4">
      {/* User message skeleton - right aligned with background */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <Skeleton className={cn(
            "h-[60px] w-[280px] rounded-xl",
            "bg-[#F3F4F6]/50 dark:bg-[#2a2a2a]/50"
          )} />
        </div>
      </div>

      {/* Assistant message skeleton - left aligned with border */}
      <div className="flex justify-start">
        <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
          <Skeleton className={cn(
            "h-[120px] w-[420px] rounded-xl",
            "bg-transparent border border-border/30"
          )} />
        </div>
      </div>

      {/* User message skeleton - shorter */}
      <div className="flex justify-end">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <Skeleton className={cn(
            "h-[45px] w-[200px] rounded-xl",
            "bg-[#F3F4F6]/50 dark:bg-[#2a2a2a]/50"
          )} />
        </div>
      </div>

      {/* Assistant message skeleton - wider */}
      <div className="flex justify-start">
        <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
          <Skeleton className={cn(
            "h-[160px] w-[500px] rounded-xl",
            "bg-transparent border border-border/30"
          )} />
        </div>
      </div>
    </div>
  );
}
