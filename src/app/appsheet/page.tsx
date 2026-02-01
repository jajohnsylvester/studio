
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AppSheetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        AppSheet
      </h1>
      <Card className="w-full h-[80vh]">
        <CardContent className="p-0 h-full">
          <iframe
            src="https://docs.google.com/spreadsheets/d/1hHsQpI-dOkeX8gm8thtns51bpz3gJNHK1iK4AoopH6w/edit?usp=sharing&rm=minimal"
            className="w-full h-full border-0"
            title="AppSheet"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
