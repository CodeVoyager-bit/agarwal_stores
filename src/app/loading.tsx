import { LoaderPinwheel } from "lucide-react";
import { getT } from "@/lib/i18n/server";

/** While a page loads: a chakri spinning in saffron. Screen readers hear "Loading". */
export default async function Loading() {
  const t = await getT();
  return (
    <div className="page-loading" aria-busy="true">
      <span className="chakri" aria-hidden="true">
        <LoaderPinwheel size={44} strokeWidth={1.75} />
      </span>
      <p role="status">{t.common.loading}</p>
    </div>
  );
}
