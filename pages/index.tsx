import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Place = { id: string; name: string; lat: number; lng: number };

// 動的 import（SSR 無効）で Leaflet を読み込む
const LeafletMap = dynamic(() => import("../components/LeafletMap"), {
  ssr: false,
});

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("places").select("*");
      setPlaces(data || []);
    }
    load();
  }, []);

  return (
    <div style={{ height: "100vh" }}>
      <LeafletMap places={places} />
    </div>
  );
}
