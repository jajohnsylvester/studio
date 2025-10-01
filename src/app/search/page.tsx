
"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Search
      </h1>
      <Card className="flex-grow">
        <CardContent className="p-0 h-full">
          <iframe
            src="https://mypersonalstream.streamlit.app/?embed=true"
            className="w-full h-full border-0"
            title="Embedded Streamlit App"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
