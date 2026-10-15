import { Course, Result, ProblemDetails } from "../types";
import { api } from "./client";

export type GetCourseResult = Result<Course, ProblemDetails>;

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
            error,
        };
    }

    return {
        state: "success",
        data,
    };
}