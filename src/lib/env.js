export function isProductionEnvironment(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === "production";
}

function readEnvValue(name, envObject = process.env) {
  const value = envObject[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getMissingEnvNames(names, envObject = process.env) {
  return names.filter((name) => !readEnvValue(name, envObject));
}

export function assertEnv(
  names,
  { envObject = process.env, label = "Environment" } = {},
) {
  const missing = getMissingEnvNames(names, envObject);

  if (!missing.length) {
    return;
  }

  throw new Error(
    `${label} is missing required env vars: ${missing.join(", ")}`,
  );
}

export function readRequiredEnv(
  name,
  { envObject = process.env, fallbackInTest = "" } = {},
) {
  const value = readEnvValue(name, envObject);

  if (value) {
    return value;
  }

  if (envObject.NODE_ENV === "test" && fallbackInTest) {
    return fallbackInTest;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}
