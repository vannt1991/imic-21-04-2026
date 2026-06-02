import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function jsonError(message, status = 400, details) {
  return Response.json(
    details ? { error: { message, details } } : { error: { message } },
    {
      status,
    },
  );
}

export function jsonSuccess(data, status = 200) {
  return Response.json(data, {
    status,
  });
}

export function formatZodIssue(error) {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `${path}: ${issue.message}`;
  });
}

export function handleRouteError(error) {
  if (error instanceof SyntaxError) {
    return jsonError("Invalid JSON", 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return jsonError(error.message, 400);
  }
  if (error instanceof ZodError) {
    return jsonError("Invalid request data", 400, formatZodIssue(error));
  }

  console.error(error);
  return jsonError("Internal server error", 500);
}
