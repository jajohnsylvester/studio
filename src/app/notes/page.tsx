
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Notes
      </h1>
      <Card className="w-full h-[80vh]">
        <CardContent className="p-0 h-full">
          <iframe
            src="https://docs.google.com/document/d/1PPjg0gov0Ma9Hr29yNLMCcy6dgKfx1ovYNRW4xpQ0uw/edit?usp=sharing&rm=minimal"
            className="w-full h-full border-0"
            title="Notes Google Doc"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
