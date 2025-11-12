import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  gradient?: boolean;
  inline?: boolean;
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  gradient = false,
  inline = false
}: PageHeaderProps) {
  return (
    <div 
      className={cn(
        "rounded-xl px-4 sm:px-6 py-4 border-b",
        inline 
          ? "flex flex-wrap items-center gap-1 sm:gap-2"
          : "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        gradient 
          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" 
          : "bg-primary/10",
        className
      )}
      data-testid="page-header"
    >
      {inline ? (
        <>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {title}
          </h1>
          {children && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {children}
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground w-full mt-1">
              {description}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {children && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  );
}
