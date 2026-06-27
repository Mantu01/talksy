import { IdRef } from "@/types/domain";

export const getId = (value?: (IdRef | { _id?: string; id?: string }) | null): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

export const hasId = (items: IdRef[] | undefined, id: string): boolean => (
  Boolean(items?.some((item) => getId(item) === id))
);
