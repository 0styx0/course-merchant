import "server-only";

import { api } from "./client";
import { components } from "./generated.js";

export type Course = components["schemas"]["Course"];

export async function getCourses() {
  const { data, error } = await api.GET("/courses");

  if (error || !data) {
    throw new Error("Failed to fetch courses");
  }

  return data;
}