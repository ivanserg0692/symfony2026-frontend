/**
 * A single field condition. The operator describes how to compare its value.
 *
 * @example
 * { field: "priceFrom", operator: "eq", value: 1000 }
 *
 * @example
 * // The catalog API supports selecting multiple sections with one condition:
 * { field: "sectionIds", operator: "in", value: [10, 20] }
 *
 * Allowed fields and operators depend on the API endpoint; the catalog provider
 * validates its supported combinations before serializing query parameters.
 */
export type { LogicalFilter } from "@refinedev/core";

/**
 * A group of conditions joined by `and` or `or`. Groups can contain other groups.
 * The optional `key` identifies the group in Refine, rather than an API field.
 *
 * @example
 * // priceFrom = 1000 AND (sectionId = 10 OR sectionId = 20)
 * {
 *   operator: "and",
 *   value: [
 *     { field: "priceFrom", operator: "eq", value: 1000 },
 *     {
 *       operator: "or",
 *       value: [
 *         { field: "sectionId", operator: "eq", value: 10 },
 *         { field: "sectionId", operator: "eq", value: 20 },
 *       ],
 *     },
 *   ],
 * }
 *
 * Our API accepts named query parameters without a general format for grouped
 * conditions, so the data provider rejects these groups. For multiple catalog
 * sections, use LogicalFilter with `sectionIds` and `in` as shown above.
 */
export type { ConditionalFilter } from "@refinedev/core";
