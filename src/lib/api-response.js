import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function jsonError(message, status, details) {
  const body = { error: { message } };

  if (details !== undefined) {
    body.error.details = details;
  }

  return Response.json(body, { status });
}

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }));
}

function isJsonParseError(error) {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  if (typeof error.message !== "string") {
    return false;
  }

  const message = error.message.toLowerCase();

  return message.includes("json") || message.includes("unexpected token");
}

export const productRouteErrorOptions = Object.freeze({
  conflictMessage: "Product slug must be unique.",
  notFoundMessage: "Product not found.",
  treatJsonSyntaxErrorAsBadRequest: true,
});

export function createRouteErrorHandler(options = {}) {
  const {
    conflictMessage = "Conflict.",
    notFoundMessage = "Resource not found.",
    treatJsonSyntaxErrorAsBadRequest = false,
  } = options;

  return function routeErrorHandler(error) {
    if (treatJsonSyntaxErrorAsBadRequest && isJsonParseError(error)) {
      return jsonError("Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return jsonError("Validation failed.", 400, formatZodIssues(error));
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return jsonError(conflictMessage, 409);
      }

      if (error.code === "P2025") {
        return jsonError(notFoundMessage, 404);
      }
    }

    console.error(error);

    return jsonError("Internal server error.", 500);
  };
}

export function handleRouteError(error, options = {}) {
  return createRouteErrorHandler(options)(error);
}

export function handleProductRouteError(error) {
  return handleRouteError(error, productRouteErrorOptions);
}
