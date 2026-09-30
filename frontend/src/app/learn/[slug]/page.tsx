import { notFound } from "next/navigation";
import { ALL_LESSONS, LESSON_MAP } from "@/content/modules";
import { LessonView } from "@/components/lesson/LessonView";

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = LESSON_MAP[slug];
  return { title: l ? `${l.title} — Transcript AI Lab` : "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LESSON_MAP[slug]) notFound();
  return <LessonView slug={slug} />;
}
