import { useActions } from 'tldraw'
export function TestActions() {
  const actions = useActions();
  console.log("Actions:", Object.keys(actions));
  return null;
}
