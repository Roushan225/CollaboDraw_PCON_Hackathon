import { createTLStore, defaultShapeUtils, defaultBindingUtils, getSnapshot, loadSnapshot } from "tldraw";

const store1 = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
});

// Simulate drawing
store1.put([
  { typeName: "shape", id: "shape:rect-1", type: "geo", x: 0, y: 0, props: { w: 100, h: 100, geo: "rectangle" } }
]);

const snapshot = getSnapshot(store1);
console.log("Got snapshot:", !!snapshot.store["shape:rect-1"]);

const store2 = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
});

try {
  loadSnapshot(store2, snapshot);
  console.log("Success! Shapes in store 2:", store2.allRecords().filter(r => r.typeName === 'shape').length);
} catch (e) {
  console.error("Failed:", e.message);
}
