import type { Metadata } from "next";
import { DogMapView } from "@/components/map/DogMapView";
import { mapDogs } from "@/lib/mapDogs";

export const metadata: Metadata = {
  title: { absolute: "Fat Dogs Everywhere | Dog Map" },
  description:
    "Meet fat dogs from Delhi and beyond. Explore the map, see their photos and videos, and add a dog using your exact or approximate GPS location.",
  alternates: { canonical: "/dogs/map" },
};

export default async function DogMapPage() {
  const { items } = await mapDogs();
  // count = every dog on this page: the tournament's 64 + all community uploads
  return <DogMapView items={items} total={items.length} />;
}
