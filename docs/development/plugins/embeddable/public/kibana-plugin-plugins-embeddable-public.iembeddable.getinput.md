<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [kibana-plugin-plugins-embeddable-public](./kibana-plugin-plugins-embeddable-public.md) &gt; [IEmbeddable](./kibana-plugin-plugins-embeddable-public.iembeddable.md) &gt; [getInput](./kibana-plugin-plugins-embeddable-public.iembeddable.getinput.md)

## IEmbeddable.getInput() method

Get the input used to instantiate this embeddable. The input is a serialized representation of this embeddable instance and can be used to clone or re-instantiate it. Input state:

- Can be updated externally - Can change multiple times for a single embeddable instance.

Examples: title, pie slice colors, custom search columns and sort order.

<b>Signature:</b>

```typescript
getInput(): Readonly<I>;
```
<b>Returns:</b>

`Readonly<I>`

