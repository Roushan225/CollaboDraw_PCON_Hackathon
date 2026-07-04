import { createTLStore, defaultShapeUtils, defaultBindingUtils, loadSnapshot } from "tldraw";

const snapshot = {
  store: {
    "shape:123": { typeName: "shape", id: "shape:123", type: "geo", x: 0, y: 0, props: { w: 100, h: 100, geo: "rectangle" } }
  },
  schema: { schemaVersion: 2, sequences: { "com.tldraw.store": 4, "com.tldraw.asset": 1, "com.tldraw.camera": 1, "com.tldraw.document": 2, "com.tldraw.instance": 25, "com.tldraw.instance_page_state": 5, "com.tldraw.page": 1, "com.tldraw.instance_presence": 5, "com.tldraw.pointer": 1, "com.tldraw.shape": 4, "com.tldraw.asset.bookmark": 2, "com.tldraw.asset.image": 5, "com.tldraw.asset.video": 5, "com.tldraw.shape.group": 0, "com.tldraw.shape.text": 2, "com.tldraw.shape.bookmark": 2, "com.tldraw.shape.draw": 2, "com.tldraw.shape.geo": 9, "com.tldraw.shape.note": 8, "com.tldraw.shape.line": 5, "com.tldraw.shape.frame": 0, "com.tldraw.shape.arrow": 5, "com.tldraw.shape.highlight": 1, "com.tldraw.shape.embed": 4, "com.tldraw.shape.image": 4, "com.tldraw.shape.video": 2, "com.tldraw.binding.arrow": 0 } }
};

const store = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
});

try {
  loadSnapshot(store, snapshot);
  console.log("Snapshot loaded successfully");
  console.log("Shapes in store:", store.allRecords().filter(r => r.typeName === 'shape'));
} catch (e) {
  console.error("Failed:", e.message);
}
