import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";

type Place = { id: string; name: string; lat: number; lng: number };

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
