import { describe, it, expect } from "vitest";
import {
  objectTypeToElement,
  linkTypeToElement,
  actionTypeToElement,
  metadataToElements,
  mergeElements,
  generateSyncSummary,
  countElementsByKind,
  extractOntologyLinkEdges,
} from "../foundrySync";
import type {
  FoundryObjectType,
  FoundryLinkType,
  FoundryActionType,
  FoundryFullMetadata,
} from "../foundryTypes";
import type { OntologyElement } from "../../types";

const sampleObjectType: FoundryObjectType = {
  apiName: "Order",
  displayName: "Order",
  description: "A customer order",
  primaryKey: "orderId",
  status: "ACTIVE",
  properties: {
    orderId: {
      apiName: "orderId",
      displayName: "Order ID",
      dataType: { type: "string" },
    },
    status: {
      apiName: "status",
      displayName: "Status",
      dataType: { type: "string" },
    },
    totalAmount: {
      apiName: "totalAmount",
      displayName: "Total Amount",
      dataType: { type: "double" },
    },
  },
  rid: "ri.ontology.main.object-type.order-123",
};

const sampleObjectTypeWithArrayPK: FoundryObjectType = {
  apiName: "CompositeKey",
  displayName: "Composite Key Object",
  description: "Object with composite primary key",
  primaryKey: ["keyPart1", "keyPart2"],
  status: "ACTIVE",
  properties: {},
  rid: "ri.ontology.main.object-type.composite-456",
};

const sampleLinkType: FoundryLinkType = {
  apiName: "OrderToCustomer",
  displayName: "Order to Customer",
  description: "Links orders to customers",
  cardinality: "MANY_TO_MANY",
  objectTypeApiNameA: "Order",
  objectTypeApiNameB: "Customer",
  rid: "ri.ontology.main.link-type.order-customer-789",
};

const sampleActionType: FoundryActionType = {
  apiName: "createOrder",
  displayName: "Create Order",
  description: "Creates a new order",
  parameters: {
    customerId: {
      apiName: "customerId",
      displayName: "Customer ID",
      dataType: { type: "string" },
      required: true,
    },
    products: {
      apiName: "products",
      displayName: "Products",
      dataType: { type: "array" },
      required: true,
    },
  },
  status: "ACTIVE",
  rid: "ri.ontology.main.action-type.create-order-abc",
};

const sampleFullMetadata: FoundryFullMetadata = {
  ontology: {
    apiName: "TestOntology",
    displayName: "Test Ontology",
    rid: "ri.ontology.main.ontology.test-ont",
  },
  objectTypes: {
    Order: sampleObjectType,
    Customer: {
      apiName: "Customer",
      displayName: "Customer",
      primaryKey: "customerId",
      status: "ACTIVE",
      properties: {
        customerId: {
          apiName: "customerId",
          dataType: { type: "string" },
        },
        name: {
          apiName: "name",
          dataType: { type: "string" },
        },
      },
      rid: "ri.ontology.main.object-type.customer-456",
    },
  },
  linkTypes: {
    OrderToCustomer: sampleLinkType,
  },
  actionTypes: {
    createOrder: sampleActionType,
  },
  interfaceTypes: {
    Auditable: {
      apiName: "Auditable",
      displayName: "Auditable",
      description: "Interface for auditable objects",
      properties: {
        createdAt: {
          apiName: "createdAt",
          dataType: { type: "timestamp" },
        },
      },
      rid: "ri.ontology.main.interface.auditable-123",
    },
  },
  queryTypes: {
    getOrdersByCustomer: {
      apiName: "getOrdersByCustomer",
      displayName: "Get Orders by Customer",
      version: "1.0.0",
      rid: "ri.ontology.main.query.get-orders-xyz",
    },
  },
};

describe("objectTypeToElement", () => {
  it("converts a basic object type to OntologyElement", () => {
    const result = objectTypeToElement(sampleObjectType);

    expect(result.id).toBe("foundry-obj-Order");
    expect(result.kind).toBe("objectType");
    expect(result.name).toBe("Order");
    expect(result.description).toBe("A customer order");
    expect(result.primaryKey).toBe("orderId");
    expect(result.properties).toEqual(["orderId", "status", "totalAmount"]);
    expect(result.foundryRid).toBe("ri.ontology.main.object-type.order-123");
    expect(result.foundryApiName).toBe("Order");
  });

  it("handles array primary key by using first element", () => {
    const result = objectTypeToElement(sampleObjectTypeWithArrayPK);

    expect(result.primaryKey).toBe("keyPart1");
  });

  it("uses apiName as displayName fallback", () => {
    const objWithoutDisplayName = {
      ...sampleObjectType,
      displayName: undefined as unknown as string,
    };
    const result = objectTypeToElement(objWithoutDisplayName);

    expect(result.name).toBe("Order");
  });

  it("handles empty properties", () => {
    const objWithNoProps = {
      ...sampleObjectType,
      properties: {},
    };
    const result = objectTypeToElement(objWithNoProps);

    expect(result.properties).toEqual([]);
  });

  it("handles missing description", () => {
    const objWithoutDesc = {
      ...sampleObjectType,
      description: undefined,
    };
    const result = objectTypeToElement(objWithoutDesc);

    expect(result.description).toBe("");
  });
});

describe("linkTypeToElement", () => {
  it("converts a link type to OntologyElement", () => {
    const result = linkTypeToElement(sampleLinkType);

    expect(result.id).toBe("foundry-link-OrderToCustomer");
    expect(result.kind).toBe("linkType");
    expect(result.name).toBe("Order to Customer");
    expect(result.description).toBe("Links orders to customers");
    expect(result.linkFrom).toBe("Order");
    expect(result.linkTo).toBe("Customer");
    expect(result.foundryRid).toBe("ri.ontology.main.link-type.order-customer-789");
    expect(result.foundryApiName).toBe("OrderToCustomer");
  });

  it("uses apiName as displayName fallback", () => {
    const linkWithoutDisplayName = {
      ...sampleLinkType,
      displayName: undefined,
    };
    const result = linkTypeToElement(linkWithoutDisplayName);

    expect(result.name).toBe("OrderToCustomer");
  });

  it("handles missing description with cardinality fallback", () => {
    const linkWithoutDesc = {
      ...sampleLinkType,
      description: undefined,
    };
    const result = linkTypeToElement(linkWithoutDesc);

    expect(result.description).toBe("MANY_TO_MANY relationship");
  });
});

describe("actionTypeToElement", () => {
  it("converts an action type to OntologyElement", () => {
    const result = actionTypeToElement(sampleActionType);

    expect(result.id).toBe("foundry-action-createOrder");
    expect(result.kind).toBe("actionType");
    expect(result.name).toBe("Create Order");
    expect(result.description).toBe("Creates a new order");
    expect(result.properties).toEqual(["customerId", "products"]);
    expect(result.targetObject).toBe("customerId");
    expect(result.foundryRid).toBe("ri.ontology.main.action-type.create-order-abc");
  });

  it("handles action with no parameters", () => {
    const actionNoParams = {
      ...sampleActionType,
      parameters: {},
    };
    const result = actionTypeToElement(actionNoParams);

    expect(result.properties).toEqual([]);
    expect(result.targetObject).toBeUndefined();
  });
});

describe("metadataToElements", () => {
  it("converts full metadata to array of OntologyElements", () => {
    const result = metadataToElements(sampleFullMetadata);

    expect(Array.isArray(result)).toBe(true);

    const objectTypes = result.filter((el) => el.kind === "objectType");
    const linkTypes = result.filter((el) => el.kind === "linkType");
    const actionTypes = result.filter((el) => el.kind === "actionType");
    const interfaces = result.filter((el) => el.kind === "interface");
    const functions = result.filter((el) => el.kind === "function");

    expect(objectTypes).toHaveLength(2);
    expect(linkTypes.length).toBeGreaterThanOrEqual(1);
    expect(actionTypes).toHaveLength(1);
    expect(interfaces).toHaveLength(1);
    expect(functions).toHaveLength(1);
  });

  it("handles empty metadata", () => {
    const emptyMetadata: FoundryFullMetadata = {
      ontology: {
        apiName: "Empty",
        displayName: "Empty",
        rid: "ri.empty",
      },
      objectTypes: {},
      linkTypes: {},
      actionTypes: {},
      interfaceTypes: {},
      queryTypes: {},
    };
    const result = metadataToElements(emptyMetadata);

    expect(result).toEqual([]);
  });

  it("handles nested API response formats", () => {
    const nestedMetadata: FoundryFullMetadata = {
      ontology: sampleFullMetadata.ontology,
      objectTypes: {
        Order: {
          objectType: sampleObjectType,
        } as unknown as FoundryObjectType,
      },
      linkTypes: {},
      actionTypes: {},
      interfaceTypes: {},
      queryTypes: {},
    };
    const result = metadataToElements(nestedMetadata);

    const orderElement = result.find((el) => el.name === "Order");
    expect(orderElement).toBeDefined();
    expect(orderElement?.kind).toBe("objectType");
  });

  it("handles snake_case API response formats", () => {
    const snakeCaseMetadata: FoundryFullMetadata = {
      ontology: sampleFullMetadata.ontology,
      objectTypes: {
        Order: {
          api_name: "Order",
          display_name: "Order Display",
          primary_key: "orderId",
          properties: {},
          rid: "ri.test",
        } as unknown as FoundryObjectType,
      },
      linkTypes: {},
      actionTypes: {},
      interfaceTypes: {},
      queryTypes: {},
    };
    const result = metadataToElements(snakeCaseMetadata);

    const orderElement = result.find((el) => el.foundryApiName === "Order");
    expect(orderElement).toBeDefined();
  });
});

describe("mergeElements", () => {
  const existingElements: OntologyElement[] = [
    {
      id: "local-1",
      kind: "objectType",
      name: "Order",
      description: "Local order",
      properties: ["orderId"],
    },
    {
      id: "local-2",
      kind: "objectType",
      name: "LocalOnly",
      description: "Only exists locally",
      properties: [],
    },
  ];

  const fromFoundry: OntologyElement[] = [
    {
      id: "foundry-obj-Order",
      kind: "objectType",
      name: "Order",
      description: "Updated from Foundry",
      properties: ["orderId", "status"],
      foundryRid: "ri.order.123",
      foundryApiName: "Order",
    },
    {
      id: "foundry-obj-NewType",
      kind: "objectType",
      name: "NewType",
      description: "New from Foundry",
      properties: [],
      foundryRid: "ri.newtype.456",
    },
  ];

  it("preserves local ID when updating existing element", () => {
    const result = mergeElements(existingElements, fromFoundry);

    const order = result.find((el) => el.name === "Order");
    expect(order?.id).toBe("local-1");
  });

  it("updates fields from Foundry for matching elements", () => {
    const result = mergeElements(existingElements, fromFoundry);

    const order = result.find((el) => el.name === "Order");
    expect(order?.description).toBe("Updated from Foundry");
    expect(order?.properties).toEqual(["orderId", "status"]);
    expect(order?.foundryRid).toBe("ri.order.123");
  });

  it("preserves local-only elements", () => {
    const result = mergeElements(existingElements, fromFoundry);

    const localOnly = result.find((el) => el.name === "LocalOnly");
    expect(localOnly).toBeDefined();
    expect(localOnly?.id).toBe("local-2");
  });

  it("adds new elements from Foundry", () => {
    const result = mergeElements(existingElements, fromFoundry);

    const newType = result.find((el) => el.name === "NewType");
    expect(newType).toBeDefined();
    expect(newType?.foundryRid).toBe("ri.newtype.456");
  });

  it("matches link types by foundryApiName", () => {
    const existingWithLink: OntologyElement[] = [
      {
        id: "local-link-1",
        kind: "linkType",
        name: "Order Link",
        description: "Local link",
        properties: [],
        linkFrom: "Order",
        linkTo: "Customer",
        foundryApiName: "OrderToCustomer",
      },
    ];

    const foundryLinks: OntologyElement[] = [
      {
        id: "foundry-link-OrderToCustomer",
        kind: "linkType",
        name: "Order to Customer (updated)",
        description: "Updated link",
        properties: [],
        linkFrom: "Order",
        linkTo: "Customer",
        foundryApiName: "OrderToCustomer",
        foundryRid: "ri.link.123",
      },
    ];

    const result = mergeElements(existingWithLink, foundryLinks);

    const link = result.find((el) => el.kind === "linkType");
    expect(link?.id).toBe("local-link-1");
    expect(link?.name).toBe("Order to Customer (updated)");
    expect(link?.foundryRid).toBe("ri.link.123");
  });
});

describe("countElementsByKind", () => {
  it("counts elements by kind correctly", () => {
    const elements: OntologyElement[] = [
      { id: "1", kind: "objectType", name: "A", description: "", properties: [] },
      { id: "2", kind: "objectType", name: "B", description: "", properties: [] },
      { id: "3", kind: "linkType", name: "C", description: "", properties: [] },
      { id: "4", kind: "actionType", name: "D", description: "", properties: [] },
    ];

    const result = countElementsByKind(elements);

    expect(result.objectType).toBe(2);
    expect(result.linkType).toBe(1);
    expect(result.actionType).toBe(1);
  });

  it("returns empty object for empty array", () => {
    const result = countElementsByKind([]);

    expect(result).toEqual({});
  });
});

describe("generateSyncSummary", () => {
  it("generates summary with all element types", () => {
    const elements: OntologyElement[] = [
      { id: "1", kind: "objectType", name: "A", description: "", properties: [] },
      { id: "2", kind: "objectType", name: "B", description: "", properties: [] },
      { id: "3", kind: "linkType", name: "C", description: "", properties: [] },
      { id: "4", kind: "actionType", name: "D", description: "", properties: [] },
      { id: "5", kind: "interface", name: "E", description: "", properties: [] },
      { id: "6", kind: "function", name: "F", description: "", properties: [] },
    ];

    const result = generateSyncSummary(elements);

    expect(result).toContain("2 object types");
    expect(result).toContain("1 link type");
    expect(result).toContain("1 action type");
    expect(result).toContain("1 interface");
    expect(result).toContain("1 function");
  });

  it("returns message for empty elements", () => {
    const result = generateSyncSummary([]);

    expect(result).toBe("No elements found in Foundry ontology");
  });

  it("handles single element count", () => {
    const elements: OntologyElement[] = [
      { id: "1", kind: "objectType", name: "A", description: "", properties: [] },
    ];

    const result = generateSyncSummary(elements);

    expect(result).toContain("1 object type");
  });
});

describe("extractOntologyLinkEdges", () => {
  it("extracts link edges from metadata", () => {
    const result = extractOntologyLinkEdges(sampleFullMetadata);

    expect(Array.isArray(result)).toBe(true);

    const orderToCustomerEdge = result.find((e) => e.linkApi === "OrderToCustomer");
    expect(orderToCustomerEdge).toBeDefined();
    expect(orderToCustomerEdge?.fromApi).toBe("Order");
    expect(orderToCustomerEdge?.toApi).toBe("Customer");
  });

  it("handles empty link types", () => {
    const metadataNoLinks: FoundryFullMetadata = {
      ...sampleFullMetadata,
      linkTypes: {},
    };

    const result = extractOntologyLinkEdges(metadataNoLinks);

    expect(result).toEqual([]);
  });
});
