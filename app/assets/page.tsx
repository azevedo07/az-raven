import AssetLibrary from "@/components/assets/AssetLibrary";

export default function AssetsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold">Assets</h1>
        <p className="mt-1 text-[13.5px] text-textSecondary">Biblioteca visual, sonora e audiovisual do projeto.</p>
      </div>

      <AssetLibrary projectId="o-corvo" />
    </div>
  );
}
