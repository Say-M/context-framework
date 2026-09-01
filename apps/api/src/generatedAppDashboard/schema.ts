import { readFileSync } from "node:fs";

export interface FieldInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  isId: boolean;
  isRelation: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

export interface ModelInfo {
  name: string;
  apiPath: string;
  fields: FieldInfo[];
}

const SCALAR_INPUT_KINDS = new Set(["String", "Int", "Float", "Boolean", "DateTime", "Json", "Bytes", "Decimal", "BigInt"]);

/**
 * Deterministic REST-path convention for a Prisma model name: kebab-case,
 * then append "s" unless it already ends in one. The generation prompt
 * mandates every entity's CRUD router mount at exactly this path, so this
 * function and the prompt's instruction can never drift apart — both are
 * the single source of truth for the same rule.
 */
export function apiPathForModel(modelName: string): string {
  const kebab = modelName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return `/api/${kebab.endsWith("s") ? kebab : `${kebab}s`}`;
}

function extractBlocks(source: string, keyword: "model" | "enum"): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = [];
  const re = new RegExp(`${keyword}\\s+(\\w+)\\s*\\{([^}]*)\\}`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    blocks.push({ name: match[1]!, body: match[2]! });
  }
  return blocks;
}

/**
 * Parses `schema.prisma`'s text directly rather than relying on
 * `@prisma/client`'s DMMF — that's an internal API that has shifted across
 * Prisma versions, while the schema file's `model { ... }` syntax is a
 * stable, simple grammar. This is a best-effort reader (good enough to
 * drive a schema browser / API docs / basic form rendering), not a full
 * Prisma schema parser.
 */
export function loadSchema(schemaPath: string): ModelInfo[] {
  let source: string;
  try {
    source = readFileSync(schemaPath, "utf-8");
  } catch {
    return [];
  }

  const enumMap = new Map<string, string[]>();
  for (const block of extractBlocks(source, "enum")) {
    const values = block.body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//"));
    enumMap.set(block.name, values);
  }

  const modelBlocks = extractBlocks(source, "model");
  const modelNames = new Set(modelBlocks.map((block) => block.name));

  return modelBlocks.map(({ name, body }) => {
    const fields: FieldInfo[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const rawType = parts[1];
      if (!fieldName || !rawType) continue;
      const attrs = parts.slice(2).join(" ");

      const isList = rawType.endsWith("[]");
      let type = isList ? rawType.slice(0, -2) : rawType;
      const isOptional = type.endsWith("?");
      if (isOptional) type = type.slice(0, -1);

      const isEnum = enumMap.has(type);
      const isRelation = /@relation\b/.test(attrs) || (modelNames.has(type) && !isEnum);

      fields.push({
        name: fieldName,
        type,
        isOptional,
        isList,
        isId: /@id\b/.test(attrs),
        isRelation,
        isEnum,
        enumValues: isEnum ? enumMap.get(type) : undefined,
      });
    }
    return { name, apiPath: apiPathForModel(name), fields };
  });
}

export function isEditableScalar(field: FieldInfo): boolean {
  return !field.isRelation && !field.isList && (SCALAR_INPUT_KINDS.has(field.type) || field.isEnum);
}
