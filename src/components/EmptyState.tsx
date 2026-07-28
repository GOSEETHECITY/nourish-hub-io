import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

/** Friendly placeholder shown instead of an empty table or list. */
export default function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, actionTo, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {actionLabel && actionTo && (
        <Button asChild className="mt-5"><Link to={actionTo}>{actionLabel}</Link></Button>
      )}
      {actionLabel && !actionTo && onAction && (
        <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
