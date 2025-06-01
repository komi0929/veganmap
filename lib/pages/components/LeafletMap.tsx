import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

type Place = { id: string; name: string; lat: number; lng: number };

export default function LeafletMap({ places }: { places: Place[] }) {
  useEffect(() => {
    // Leaflet のアイコン画像パスをブラウザで読める URL に差し替え
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={[33.583, 130.395]} // 福岡市中心
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]}>
          <Popup>{p.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
