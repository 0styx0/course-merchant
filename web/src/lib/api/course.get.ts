import { Course, Result } from "../types";
import { api } from "./client";

export type GetCourseResult = Result<Course, string>;

export async function getCourse(
    courseId: string,
): Promise<GetCourseResult> {
    const { data, error } = await api.GET("/courses/{courseId}", {
        params: {
            path: { courseId },
        },
    });

    if (error || !data) {
        return {
            state: "failure",
            error: error?.code ?? "UNKNOWN_ERROR",
        };
    }

    return {
        state: "success",
        data,
    };
}