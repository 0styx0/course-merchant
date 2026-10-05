export type Result<T, E> =
  | {
      state: "success";
      data: T;
    }
  | {
      state: "failure";
      error: E;
    };
