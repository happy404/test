export function requireEnv(name) {
  const val = process.env[name];
  if (!val)
    throw new Error(`${name} is not set`);
  return val;
}
