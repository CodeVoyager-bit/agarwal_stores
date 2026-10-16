import { LoaderPinwheel } from "lucide-react";

/** While a page loads: a chakri spinning in saffron. Screen readers hear "Loading". */
export default function Loading() {
  return (
    <div className="page-loading" aria-busy="true">
      <span className="chakri" aria-hidden="true">
        <LoaderPinwheel size={44} strokeWidth={1.75} />
      </span>
      <p role="status">Loading…</p>
    </div>
  );
}
