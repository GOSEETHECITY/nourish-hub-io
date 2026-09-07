import ConsumerMapView from "@/components/consumer/ConsumerMapView";

export default function MapTest() {
  return (
    <div className="h-screen w-screen">
      <ConsumerMapView
        center={[27.9506, -82.4572]}
        markers={[{ id: "1", name: "Test", lat: 27.9506, lng: -82.4572, type: "restaurant" }]}
        onMarkerClick={() => {}}
      />
    </div>
  );
}
