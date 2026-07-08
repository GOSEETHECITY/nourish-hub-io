import { Card } from "@/components/ui/card";

export default function DistrictPlaceholder({ title }: { title: string }) {
  return (
    <div className="max-w-[1600px] mx-auto">
      <Card className="p-10 rounded-2xl border-0 shadow-sm bg-card text-center">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">This section is coming soon.</p>
      </Card>
    </div>
  );
}
