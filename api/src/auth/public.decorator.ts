import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";

/** Opts a handler or controller out of the admin auth guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
