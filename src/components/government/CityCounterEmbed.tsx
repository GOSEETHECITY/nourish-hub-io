import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Code2 } from "lucide-react";

/** Shows copy-ready embed code for the public "meals rescued in [City]" widget. */
export default function CityCounterEmbed({ cities, defaultState }: { cities: string[]; defaultState: string }) {
  const [city, setCity] = useState(cities[0] || "");
  const [state, setState] = useState(defaultState);
  const src = `https://hariet.ai/widget/meals?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
  const code = `<iframe src="${src}" title="Meals rescued in ${city}" width="320" height="180" style="border:0;border-radius:12px" loading="lazy"></iframe>`;
  return (
    <div className="bg-card rounded-xl border p-6 space-y-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Code2 className="w-5 h-5" />Public city counter</h2>
      <p className="text-sm text-muted-foreground">Put a live "meals rescued" counter on your city's website. Copy this code into any page.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} list="gov-embed-cities" /><datalist id="gov-embed-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
      </div>
      <Textarea readOnly value={code} className="font-mono text-xs h-24" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" disabled={!city} onClick={() => { navigator.clipboard.writeText(code); toast.success("Embed code copied"); }}>Copy embed code</Button>
        <Button size="sm" variant="outline" disabled={!city} asChild><a href={src.replace("https://hariet.ai", "")} target="_blank" rel="noopener noreferrer">Preview</a></Button>
      </div>
    </div>
  );
}
