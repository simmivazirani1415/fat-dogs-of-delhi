// Client-safe dog lookups (dogs.json + blur placeholders are small enough to ship).
import dogsJson from "@/data/dogs.json";
import blurJson from "@/data/dog-blur.json";

export type DogStatus = `in_${string}` | `out_${string}` | "champion";

export type Dog = {
  id: string;
  name: string;
  area: string;
  image: string;
  roundOf64Match: number;
  bracketSide: "a" | "b";
  opponentId: string;
  status: DogStatus;
  statusLabel: string;
};

export const dogs = dogsJson as Dog[];
const byId = new Map(dogs.map((d) => [d.id, d]));
const blur = blurJson as Record<string, string>;

export function getDog(id: string): Dog {
  const dog = byId.get(id);
  if (!dog) throw new Error(`Unknown dog id: ${id}`);
  return dog;
}

export const findDog = (id: string) => byId.get(id);
export const dogBlur = (id: string) => blur[id];
export const dogAlt = (dog: Pick<Dog, "name" | "area">) => `${dog.name} from ${dog.area}`;
export const isAlive = (dog: Dog) => dog.status === "champion" || dog.status.startsWith("in_");
