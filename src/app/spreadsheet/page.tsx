
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SpreadsheetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        StockMarketNotes Google sheet
      </h1>
      <Card className="w-full h-[80vh]">
        <CardContent className="p-0 h-full">
          <iframe
            src="https://docs.google.com/spreadsheets/d/1KjNfd9nu_DjyKSaMcGJyMo6MQvk5qma9b92hI_BdL6Q/edit?usp=sharing&rm=minimal"
            className="w-full h-full border-0"
            title="StockMarketNotes Google sheet"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
