/**
 * Gives every `##` heading in a post a stable `id` and exports the list from
 * the MDX module as `headings`, with the post's reading time as
 * `readingMinutes`, so a post's table of contents is rendered on the server
 * with the rest of the page instead of appearing after hydration.
 *
 * The ids are made here and handed to the `h2` component as a prop, so the
 * table of contents and the headings it links to cannot disagree.
 */

const WORDS_PER_MINUTE = 230;

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function textOf(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}

/** A plain JSON value as an ESTree expression, for an MDX `export`. */
function toEstree(value) {
  if (Array.isArray(value)) {
    return { type: "ArrayExpression", elements: value.map(toEstree) };
  }
  if (value && typeof value === "object") {
    return {
      type: "ObjectExpression",
      properties: Object.entries(value).map(([key, entry]) => ({
        type: "Property",
        key: { type: "Identifier", name: key },
        value: toEstree(entry),
        kind: "init",
        method: false,
        shorthand: false,
        computed: false,
      })),
    };
  }
  return { type: "Literal", value };
}

function exportConsts(values) {
  return {
    type: "mdxjsEsm",
    value: "",
    data: {
      estree: {
        type: "Program",
        sourceType: "module",
        body: [
          {
            type: "ExportNamedDeclaration",
            specifiers: [],
            source: null,
            declaration: {
              type: "VariableDeclaration",
              kind: "const",
              declarations: Object.entries(values).map(([name, value]) => ({
                type: "VariableDeclarator",
                id: { type: "Identifier", name },
                init: toEstree(value),
              })),
            },
          },
        ],
      },
    },
  };
}

export function remarkHeadings() {
  return (tree) => {
    const headings = [];
    const used = new Map();
    let words = 0;
    walk(tree, (node) => {
      if (node.type === "text") {
        words += node.value.split(/\s+/).filter(Boolean).length;
      }
      if (node.type !== "heading" || node.depth !== 2) return;
      const text = textOf(node).trim();
      const base = slugify(text) || "section";
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);
      const id = seen ? `${base}-${seen + 1}` : base;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id },
      };
      headings.push({ id, text });
    });
    tree.children.push(
      exportConsts({
        headings,
        readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
      }),
    );
  };
}
