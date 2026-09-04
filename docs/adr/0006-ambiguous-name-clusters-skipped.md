# Ambiguous name clusters are skipped, not merged

If two official slots or two announced **Bands** share a normalized name, **name match** does not choose. The cluster is reported, skipped, and the rest of the apply proceeds; the process exits non-zero. First-slot-wins or copying picks would assign the wrong **Band**.

**Rejected:** First slot wins; duplicate picks onto every slot; abort the entire apply because one name clashed.
