---
name: feedback-effect-setstate-lint
description: react-hooks/set-state-in-effect bloqueia setState síncrono em useEffect; ajustar estado durante o render (padrão prevValue) em vez de useEffect.
metadata:
  type: feedback
---

O lint deste repo (`npm run lint`) tem a regra `react-hooks/set-state-in-effect` como **erro**,
não warning. Um `useEffect(() => setState(...), [dep])` que só reseta estado quando `dep` muda
é bloqueado.

**Como aplicar:** usar o padrão React "ajustar estado durante a renderização" em vez de efeito:

```tsx
const [value, setValue] = useState(initial);
const [prevDep, setPrevDep] = useState(dep);
if (dep !== prevDep) {
  setPrevDep(dep);
  setValue(resetValue);
}
```

Isso evita o duplo-render do `useEffect` e passa no lint. Usado em `XmlTree.tsx`
([[project_xml_navigable_tree_pbi127]]) para resetar `expandedIds` quando o XML/candidato
muda.
