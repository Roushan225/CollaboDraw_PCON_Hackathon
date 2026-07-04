import { createTLStore, defaultShapeUtils, defaultBindingUtils, getSnapshot, loadSnapshot } from "tldraw";

const store1 = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
});

const snapshot = getSnapshot(store1);

const store2 = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
});

try {
  loadSnapshot(store2, snapshot);
  console.log("Success! Schema version is OK.");
} catch (e) {
  console.error("Failed:", e.message);
}
