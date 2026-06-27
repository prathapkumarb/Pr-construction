import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PagePlaceholder({ icon: Icon, title, description }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Icon className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
