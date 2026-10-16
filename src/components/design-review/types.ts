import type { CountdownData } from "@/components/store/Countdown";
import type { DeliveryPlan } from "@/lib/delivery-plan";
import type { FaqItem } from "@/lib/defaults";
import type { RatingSummary } from "@/lib/marketing";
import type { ReturnsPolicy } from "@/lib/policies";
import type { PublicReview } from "@/lib/reviews";
import type { SizeChartRow, SizeRule } from "@/lib/sizes";
import type { StockInfo } from "@/lib/stock-status";
import type { PublicProduct } from "@/lib/types";

/** Everything a product-page concept needs, built on the server from real data (see lib/design-review.ts). */
export type PreviewData = {
  product: PublicProduct;
  siblings: PublicProduct[];
  bundleOptions: PublicProduct[];
  related: PublicProduct[];
  /** By product id. */
  stock: Record<string, StockInfo>;
  reviews: PublicReview[];
  summary: RatingSummary;
  /** database = this site's records · manifest = the client-confirmed records published in production · forced-empty = preview of the empty state */
  reviewSource: "database" | "manifest" | "forced-empty";
  /** Real admin campaign, or a labelled sample in demo mode, or nothing. */
  countdown: (CountdownData & { sample: boolean }) | null;
  plan: DeliveryPlan;
  freeShipping: boolean;
  policy: ReturnsPolicy;
  payments: { online: boolean };
  contactEmail: string;
  faq: FaqItem[];
  sizeRules: SizeRule[];
  sizeChart: SizeChartRow[];
  returnsHref: string;
};
