import { CreatorsDirectory } from "@/components/creators/CreatorsDirectory";

export const metadata = { title: "Creators · ADFLOW" };

export default function PublicCreatorsDirectoryPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <CreatorsDirectory />
    </section>
  );
}
