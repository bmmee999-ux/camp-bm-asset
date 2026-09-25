import { AssetDetailPage } from "@/components/asset-detail-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ assetNo: string }> }) {
  const { assetNo } = await params;
  return <AssetDetailPage assetNo={decodeURIComponent(assetNo)} />;
}
