import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";

type PageParams = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: PageParams }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: PageParams;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <Providers locale={locale} messages={messages}>
      <div className="relative flex min-h-full flex-col">
        <Header locale={locale} />
        <main className="flex-1">{children}</main>
      </div>
    </Providers>
  );
}
