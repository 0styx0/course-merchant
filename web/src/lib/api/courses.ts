import "server-only";

import { api } from "./client.js";

export async function getCourses() {
  const { data, error } = await api.GET("courses");

  if (error || !data) {
    throw new Error("Failed to fetch courses");
  }

  return data;
}