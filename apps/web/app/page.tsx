import { Clapperboard, Shield, Zap } from "lucide-react";

import { HomeHero } from "@/components/home-hero";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Clapperboard,
    title: "Upload once",
    description:
      "Drop MP4 or WebM files and let the pipeline queue transcoding jobs automatically.",
  },
  {
    icon: Zap,
    title: "Multi-resolution output",
    description:
      "Workers produce 480p, 720p, and 1080p variants ready for download.",
  },
  {
    icon: Shield,
    title: "Account-backed access",
    description:
      "Every upload and download is tied to your session with rate limits built in.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Video Transcoding Pipeline
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Upload, transcode, and download your videos
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A YouTube-style pipeline with SQS workers, S3 storage, and Postgres
          metadata — now with a web dashboard.
        </p>
        <HomeHero />
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="mb-2 size-5 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </div>
  );
}
