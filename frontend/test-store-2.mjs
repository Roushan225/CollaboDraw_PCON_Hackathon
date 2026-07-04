import { createTLStore, defaultShapeUtils, defaultBindingUtils } from "tldraw";

const store = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
});

const snapshot = store.getSnapshot();
console.log(JSON.stringify(snapshot.schema));
