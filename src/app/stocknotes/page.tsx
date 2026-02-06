
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StockNotesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        StockNotes
      </h1>
      <Card className="w-full h-[80vh]">
        <CardContent className="p-0 h-full">
          <iframe
            src="https://docs.google.com/spreadsheets/d/1nmKjmmoFOwkB4qHg1TBYqQ959AVCHiPJOdXtEhjNT24/edit?usp=sharing&rm=minimal"
            className="w-full h-full border-0"
            title="StockNotes"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
