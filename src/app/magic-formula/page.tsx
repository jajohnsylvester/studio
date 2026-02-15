
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MagicFormulaPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Magic formula
      </h1>
      <Card className="w-full h-[80vh]">
        <CardContent className="p-0 h-full">
          <iframe
            src="https://docs.google.com/spreadsheets/d/18sADTBE7eRsSC1NtPoihN3eg5MhW_nKZv09AaOztnz8/edit?usp=sharing"
            className="w-full h-full border-0"
            title="Magic formula"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
