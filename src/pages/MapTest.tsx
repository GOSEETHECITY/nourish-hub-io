import ConsumerMapView from "@/components/consumer/ConsumerMapView";

const markers = [
  { id: "1", name: "Test Restaurant", lat: 28.5383, lng: -81.3792, type: "restaurant" as const },
];

export default function MapTest() {
  return (
    <div className="h-screen w-screen">
      <ConsumerMapView
        center={[28.5383, -81.3792]}
        markers={markers}
        onMarkerClick={(id) => console.log("clicked", id)}
      />
    </div>
  );
}
