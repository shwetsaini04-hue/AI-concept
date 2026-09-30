import Ajv, { type ErrorObject } from "ajv";

const ajv = new Ajv({ allErrors: true, strict: false });

export interface ValidationResult {
  parseError: string | null;
  schemaError: string | null;
  errors: string[];
  valid: boolean;
  value: unknown;
}

export function humanizeError(e: ErrorObject): string {
  const path = e.instancePath ? e.instancePath.replace(/^\//, "").replace(/\//g, ".") : "(root)";
  switch (e.keyword) {
    case "required":
      return `Missing required field “${(e.params as { missingProperty: string }).missingProperty}”`;
    case "type":
      return `“${path}” must be of type ${(e.params as { type: string | string[] }).type}`;
    case "enum":
      return `“${path}” must be one of: ${(e.params as { allowedValues: unknown[] }).allowedValues.map((v) => JSON.stringify(v)).join(", ")}`;
    case "additionalProperties":
      return `Unexpected field “${(e.params as { additionalProperty: string }).additionalProperty}” (additionalProperties: false)`;
    case "minimum":
    case "maximum":
      return `“${path}” ${e.message}`;
    default:
      return `“${path}” ${e.message ?? e.keyword}`;
  }
}

export function validateJson(schemaText: string, outputText: string): ValidationResult {
  let schema: object;
  try {
    schema = JSON.parse(schemaText);
  } catch (e) {
    return { parseError: null, schemaError: `Schema is not valid JSON: ${(e as Error).message}`, errors: [], valid: false, value: null };
  }
  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (e) {
    return { parseError: null, schemaError: `Schema could not be compiled: ${(e as Error).message}`, errors: [], valid: false, value: null };
  }
  let value: unknown;
  try {
    value = JSON.parse(outputText);
  } catch (e) {
    return { parseError: (e as Error).message, schemaError: null, errors: [], valid: false, value: null };
  }
  const ok = validate(value) as boolean;
  return { parseError: null, schemaError: null, errors: ok ? [] : (validate.errors ?? []).map(humanizeError), valid: ok, value };
}
